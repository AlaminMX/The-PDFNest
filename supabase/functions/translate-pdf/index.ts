import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.3.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Common supported languages for translation
const SUPPORTED_LANGUAGES = [
  'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch',
  'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian',
  'Turkish', 'Polish', 'Vietnamese', 'Thai', 'Indonesian', 'Malay',
  'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Greek', 'Hebrew',
  'Czech', 'Romanian', 'Hungarian', 'Ukrainian', 'Bengali', 'Tamil'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileId, targetLanguage = 'Spanish', startPage = 1, endPage = 10 } = await req.json();
    
    // Input validation - fileId
    if (!fileId || typeof fileId !== 'string' || !UUID_REGEX.test(fileId)) {
      return new Response(JSON.stringify({ error: 'Invalid file ID format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Input validation - targetLanguage
    if (!targetLanguage || typeof targetLanguage !== 'string' || targetLanguage.length > 50) {
      return new Response(JSON.stringify({ error: 'Invalid target language' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check if language is in supported list (case-insensitive)
    const normalizedLanguage = SUPPORTED_LANGUAGES.find(
      lang => lang.toLowerCase() === targetLanguage.toLowerCase()
    );
    if (!normalizedLanguage) {
      return new Response(JSON.stringify({ 
        error: `Unsupported language. Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Input validation - page range
    if (typeof startPage !== 'number' || typeof endPage !== 'number' ||
        !Number.isInteger(startPage) || !Number.isInteger(endPage) ||
        startPage < 1 || endPage < startPage || endPage - startPage > 50) {
      return new Response(JSON.stringify({ error: 'Invalid page range. Start must be >= 1, end must be >= start, max 50 pages per request.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log("Translating PDF:", fileId, "to", normalizedLanguage, "pages", startPage, "-", endPage);

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

    // Get PDF file data
    const { data: pdfFile, error: fileError } = await supabase
      .from('pdf_files')
      .select('storage_path, user_id')
      .eq('id', fileId)
      .single();

    if (fileError || !pdfFile || pdfFile.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Download PDF from storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('pdfs')
      .download(pdfFile.storage_path);

    if (downloadError) {
      console.error("Download error:", downloadError);
      return new Response(JSON.stringify({ error: 'Failed to download PDF' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const arrayBuffer = await pdfData.arrayBuffer();
    
    // Use pdfjs-serverless which works perfectly in Deno
    const pdf = await getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    }).promise;
    
    const totalPages = pdf.numPages;
    const start = Math.max(1, startPage);
    const end = Math.min(endPage, totalPages);
    
    if (start > totalPages) {
      return new Response(JSON.stringify({ error: `Start page ${start} exceeds total pages ${totalPages}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    let fullText = '';

    for (let i = start; i <= end; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `[Page ${i}]\n${pageText}\n\n`;
    }

    if (fullText.length < 100) {
      return new Response(JSON.stringify({ error: 'PDF appears to be empty or unreadable' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Lovable AI for translation
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert translator. Translate the following text to ${normalizedLanguage}. Maintain the original formatting, structure, and paragraph breaks. Provide only the translation without any explanations or notes.`
          },
          {
            role: 'user',
            content: fullText.substring(0, 40000)
          }
        ],
      }),
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
    const translatedText = aiData.choices[0].message.content;

    return new Response(JSON.stringify({ 
      originalText: fullText.substring(0, 5000),
      translatedText,
      targetLanguage: normalizedLanguage,
      totalPages,
      pagesTranslated: `${start}-${end}`,
      note: end < totalPages ? `Translated pages ${start}-${end} of ${totalPages} total pages` : `Translated all ${totalPages} pages`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
