import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.3.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUPPORTED_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch',
  'Chinese', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Japanese', 'Korean', 
  'Arabic', 'Hindi', 'Russian', 'Turkish', 'Polish', 'Vietnamese', 'Thai', 
  'Indonesian', 'Malay', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Greek', 
  'Hebrew', 'Czech', 'Romanian', 'Hungarian', 'Ukrainian', 'Bengali', 'Tamil'
];

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  transform: number[];
}

interface PageData {
  pageNumber: number;
  width: number;
  height: number;
  textItems: TextItem[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileId, targetLanguage = 'Spanish', startPage = 1, endPage = 10, mode = 'full' } = await req.json();
    
    // Validate fileId
    if (!fileId || typeof fileId !== 'string' || !UUID_REGEX.test(fileId)) {
      return new Response(JSON.stringify({ error: 'Invalid file ID format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Validate language
    const normalizedLanguage = SUPPORTED_LANGUAGES.find(
      lang => lang.toLowerCase() === targetLanguage.toLowerCase()
    ) || targetLanguage;
    
    // Validate pages
    if (typeof startPage !== 'number' || typeof endPage !== 'number' ||
        startPage < 1 || endPage < startPage || endPage - startPage > 20) {
      return new Response(JSON.stringify({ 
        error: 'Invalid page range. Max 20 pages for structure-preserving translation.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log("Structure-preserving translation:", fileId, "to", normalizedLanguage);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find file
    let storagePath: string | null = null;
    let storageBucket = 'pdfs';

    const { data: pdfFile } = await supabase
      .from('pdf_files')
      .select('storage_path, user_id')
      .eq('id', fileId)
      .single();

    if (pdfFile) {
      if (pdfFile.user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'File not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      storagePath = pdfFile.storage_path;
    } else {
      const { data: lectureNote } = await supabase
        .from('lecture_notes')
        .select('file_path')
        .eq('id', fileId)
        .single();

      if (lectureNote) {
        storagePath = lectureNote.file_path;
        storageBucket = 'school_pdfs';
      }
    }

    if (!storagePath) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Download PDF
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
    
    // Extract text with position data for each page
    const pagesData: PageData[] = [];
    const textForTranslation: string[] = [];
    
    for (let i = start; i <= end; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      
      const textItems: TextItem[] = [];
      
      for (const item of textContent.items) {
        if ('str' in item && item.str.trim()) {
          const transform = item.transform as number[];
          textItems.push({
            str: item.str,
            x: transform[4],
            y: viewport.height - transform[5], // Flip Y coordinate
            width: item.width || 0,
            height: item.height || Math.abs(transform[0]) || 12,
            fontName: item.fontName || 'default',
            transform: transform,
          });
          textForTranslation.push(item.str);
        }
      }
      
      pagesData.push({
        pageNumber: i,
        width: viewport.width,
        height: viewport.height,
        textItems,
      });
    }

    // Create indexed text for translation
    const indexedText = textForTranslation.map((text, idx) => `[${idx}]${text}`).join('\n');
    
    // Translate with AI while preserving structure
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
            content: `You are an expert translator. Translate each line to ${normalizedLanguage}. 
CRITICAL RULES:
1. Each line starts with [number] - keep the number prefix exactly as is
2. Only translate the text after the [number]
3. Maintain one translation per line
4. Do not merge or split lines
5. If a line is just a number, symbol, or cannot be translated, keep it as is

Example input:
[0]Hello
[1]World
[2]123

Example output:
[0]Hola
[1]Mundo
[2]123`
          },
          {
            role: 'user',
            content: indexedText.substring(0, 30000)
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
    const translatedIndexed = aiData.choices[0].message.content;
    
    // Parse translated text back to array
    const translatedMap = new Map<number, string>();
    const lines = translatedIndexed.split('\n');
    for (const line of lines) {
      const match = line.match(/^\[(\d+)\](.*)$/);
      if (match) {
        translatedMap.set(parseInt(match[1]), match[2]);
      }
    }
    
    // Apply translations to page data
    let textIndex = 0;
    const translatedPagesData: PageData[] = pagesData.map(page => ({
      ...page,
      textItems: page.textItems.map(item => {
        const translated = translatedMap.get(textIndex) || item.str;
        textIndex++;
        return { ...item, str: translated };
      }),
    }));

    return new Response(JSON.stringify({ 
      pagesData: translatedPagesData,
      originalPagesData: pagesData,
      targetLanguage: normalizedLanguage,
      totalPages,
      pagesTranslated: `${start}-${end}`,
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
