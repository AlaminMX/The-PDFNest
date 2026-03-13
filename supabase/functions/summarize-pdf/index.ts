import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.3.2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileId } = await req.json();
    
    // Input validation
    if (!fileId || typeof fileId !== 'string' || !UUID_REGEX.test(fileId)) {
      return new Response(JSON.stringify({ error: 'Invalid file ID format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log("Summarizing PDF:", fileId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if summary already exists
    const { data: existingSummary } = await supabase
      .from('pdf_summaries')
      .select('summary')
      .eq('pdf_file_id', fileId)
      .eq('user_id', user.id)
      .single();

    if (existingSummary) {
      console.log("Returning cached summary");
      return new Response(JSON.stringify({ summary: existingSummary.summary }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to find file in pdf_files table first (user's personal PDFs)
    let storagePath: string | null = null;
    let storageBucket = 'pdfs';
    let isLectureNote = false;

    const { data: pdfFile } = await supabase
      .from('pdf_files')
      .select('storage_path, user_id')
      .eq('id', fileId)
      .single();

    if (pdfFile) {
      // User PDF - verify ownership
      if (pdfFile.user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'File not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      storagePath = pdfFile.storage_path;
    } else {
      // Try lecture_notes table (public lecture notes)
      const { data: lectureNote } = await supabase
        .from('lecture_notes')
        .select('file_path')
        .eq('id', fileId)
        .single();

      if (lectureNote) {
        storagePath = lectureNote.file_path;
        storageBucket = 'school_pdfs';
        isLectureNote = true;
        console.log("Found lecture note:", fileId);
      }
    }

    if (!storagePath) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Download PDF from storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from(storageBucket)
      .download(storagePath);

    if (downloadError) {
      console.error("Download error:", downloadError);
      return new Response(JSON.stringify({ error: 'Failed to download PDF' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const arrayBuffer = await pdfData.arrayBuffer();
    const fileSizeBytes = arrayBuffer.byteLength;
    const maxVisionSize = 5 * 1024 * 1024; // 5MB limit for vision fallback
    
    // Use pdfjs-serverless which works perfectly in Deno
    let fullText = '';
    let useVisionFallback = false;
    let pdfBase64 = '';
    
    try {
      const pdf = await getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
      }).promise;

      const totalPages = pdf.numPages;
      const maxPages = Math.min(totalPages, 100); // Process up to 100 pages
      console.log(`Processing ${maxPages} of ${totalPages} total pages`);

      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      
      // If text extraction got less than 100 chars, try vision fallback for small files
      if (fullText.trim().length < 100) {
        if (fileSizeBytes <= maxVisionSize) {
          console.log("Text extraction insufficient, using vision fallback for small file");
          pdfBase64 = base64Encode(arrayBuffer);
          useVisionFallback = true;
        } else {
          console.log("Text extraction insufficient and file too large for vision fallback");
          return new Response(JSON.stringify({ 
            error: 'This PDF appears to be a scanned document without selectable text. Scanned PDFs larger than 5MB cannot be summarized. Please try a different PDF or use a PDF with selectable text.' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    } catch (extractError) {
      console.log("Text extraction failed:", extractError);
      if (fileSizeBytes <= maxVisionSize) {
        console.log("Using vision fallback for small file");
        pdfBase64 = base64Encode(arrayBuffer);
        useVisionFallback = true;
      } else {
        return new Response(JSON.stringify({ 
          error: 'Failed to extract text from this PDF. The file may be corrupted or in an unsupported format.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Build AI request based on whether we need vision fallback
    let aiRequestBody;
    
    if (useVisionFallback) {
      console.log("Using vision model to analyze scanned PDF");
      // Use vision-capable model with PDF as data URL
      aiRequestBody = {
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at summarizing documents. Analyze the PDF document image and provide a clear, concise summary highlighting key points, main arguments, and conclusions. Use bullet points for better readability.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze and summarize this PDF document:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
      };
    } else {
      // Use text-based summarization with chunking for large documents
      // Gemini can handle ~1M tokens, but we'll use 100k chars for efficiency
      const maxChars = 100000;
      const truncatedText = fullText.length > maxChars 
        ? fullText.substring(0, maxChars) + '\n\n[Document truncated for processing...]'
        : fullText;
      
      console.log(`Text length: ${fullText.length}, using: ${truncatedText.length} chars`);
      
      aiRequestBody = {
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at summarizing documents. Provide a comprehensive summary highlighting key points, main arguments, important details, and conclusions. Structure your summary with clear sections and use bullet points for better readability. For longer documents, ensure you capture the full scope of the content.'
          },
          {
            role: 'user',
            content: `Please provide a thorough summary of the following document:\n\n${truncatedText}`
          }
        ],
      };
    }

    // Call Lovable AI for summarization
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(aiRequestBody),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", errorText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices[0].message.content;

    // Cache the summary
    await supabase.from('pdf_summaries').insert({
      pdf_file_id: fileId,
      user_id: user.id,
      summary: summary,
    });

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Unhandled error in summarize-pdf:", error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
