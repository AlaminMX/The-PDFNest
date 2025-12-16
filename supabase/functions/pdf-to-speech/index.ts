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
    const { fileId, startPage = 1, endPage = 10 } = await req.json();
    
    // Input validation - fileId
    if (!fileId || typeof fileId !== 'string' || !UUID_REGEX.test(fileId)) {
      return new Response(JSON.stringify({ error: 'Invalid file ID format' }), {
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
    
    console.log("Converting PDF to speech:", fileId, "pages:", startPage, "-", endPage);

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

    const arrayBuffer = await pdfData.arrayBuffer();
    
    // Use pdfjs-serverless which works perfectly in Deno
    const pdf = await getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    }).promise;
    
    // Validate page range against actual PDF
    if (startPage > pdf.numPages) {
      return new Response(JSON.stringify({ error: 'Invalid page range', totalPages: pdf.numPages }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const actualEndPage = Math.min(endPage, pdf.numPages);
    const pagesExtracted = actualEndPage - startPage + 1;

    // Extract text from page range
    let fullText = '';
    for (let pageNum = startPage; pageNum <= actualEndPage; pageNum++) {
      const pdfPage = await pdf.getPage(pageNum);
      const textContent = await pdfPage.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `[Page ${pageNum}]\n${pageText}\n\n`;
    }

    if (fullText.length < 10) {
      return new Response(JSON.stringify({ error: 'Pages appear to be empty or unreadable' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare note
    let note = `Extracted ${pagesExtracted} page(s) (${startPage}-${actualEndPage}).`;
    if (actualEndPage < endPage) {
      note += ` PDF has only ${pdf.numPages} pages.`;
    }
    
    return new Response(JSON.stringify({ 
      text: fullText.substring(0, 50000), // Limit for browser TTS
      totalPages: pdf.numPages,
      pagesExtracted,
      note
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
