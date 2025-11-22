import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs";

// Configure PDF.js worker from esm.sh (works in this environment)
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.worker.mjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileId, voice = 'alloy', page = 1 } = await req.json();
    console.log("Converting PDF to speech:", fileId, "voice:", voice, "page:", page);

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
      .select('storage_path, user_id, name')
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

    // Extract text from specific page
    const arrayBuffer = await pdfData.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    if (page > pdf.numPages || page < 1) {
      return new Response(JSON.stringify({ error: 'Invalid page number', totalPages: pdf.numPages }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pdfPage = await pdf.getPage(page);
    const textContent = await pdfPage.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');

    if (pageText.length < 10) {
      return new Response(JSON.stringify({ error: 'Page appears to be empty or unreadable' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For demo purposes, return text that should be read
    // In production, you would integrate with OpenAI TTS API here
    // Note: This requires OPENAI_API_KEY to be set by user
    
    return new Response(JSON.stringify({ 
      text: pageText.substring(0, 4000), // TTS usually has character limits
      totalPages: pdf.numPages,
      currentPage: page,
      message: 'Text extracted successfully. Voice synthesis requires OpenAI API key configuration.'
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