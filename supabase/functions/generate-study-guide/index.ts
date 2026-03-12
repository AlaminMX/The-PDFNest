import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.3.2";

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
    
    console.log("Generating study guide for PDF:", fileId);

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

    // Check if study guide already exists
    const { data: existingGuide } = await supabase
      .from('study_guides')
      .select('content')
      .eq('pdf_file_id', fileId)
      .eq('user_id', user.id)
      .single();

    if (existingGuide) {
      console.log("Returning cached study guide");
      return new Response(JSON.stringify({ studyGuide: existingGuide.content }), {
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
    
    // Use pdfjs-serverless which works perfectly in Deno
    const pdf = await getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    }).promise;
    let fullText = '';

    for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }

    if (fullText.length < 100) {
      return new Response(JSON.stringify({ error: 'PDF appears to be empty or unreadable' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Lovable AI for study guide generation
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
            content: 'You are an expert educational content creator. Create a comprehensive study guide from the document that includes: 1) Key Concepts (main ideas and themes), 2) Important Definitions (key terms explained), 3) Practice Questions (5-10 questions to test understanding), 4) Review Points (summary of critical information). Format your response as JSON with these four sections.'
          },
          {
            role: 'user',
            content: `Create a study guide from this document:\n\n${fullText.substring(0, 50000)}`
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
    const content = aiData.choices[0].message.content;

    // Try to parse as JSON, fallback to structured text
    let studyGuide;
    try {
      studyGuide = JSON.parse(content);
    } catch {
      // If not JSON, structure it ourselves
      studyGuide = {
        keyConcepts: content,
        definitions: '',
        practiceQuestions: '',
        reviewPoints: ''
      };
    }

    // Cache the study guide
    await supabase.from('study_guides').insert({
      pdf_file_id: fileId,
      user_id: user.id,
      content: studyGuide,
    });

    return new Response(JSON.stringify({ studyGuide }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Unhandled error in generate-study-guide:", error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
