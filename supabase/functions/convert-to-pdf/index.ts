import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Convert-to-PDF: Starting conversion");
    
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log("Convert-to-PDF: No file provided");
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Convert-to-PDF: Processing ${file.name}, type: ${file.type}, size: ${file.size}`);

    const fileName = file.name.toLowerCase();
    const fileType = file.type;
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let pdfBytes: Uint8Array;

    // Handle different file types
    if (fileType.startsWith('image/')) {
      console.log("Convert-to-PDF: Converting image");
      pdfBytes = await convertImageToPdf(uint8Array, fileType);
    } else if (fileName.endsWith('.txt') || fileType === 'text/plain') {
      console.log("Convert-to-PDF: Converting text file");
      const text = new TextDecoder().decode(uint8Array);
      pdfBytes = await convertTextToPdf(text, file.name);
    } else if (
      fileName.endsWith('.docx') || 
      fileName.endsWith('.doc') ||
      fileType.includes('wordprocessingml') ||
      fileType === 'application/msword'
    ) {
      console.log("Convert-to-PDF: Creating placeholder for Word doc");
      pdfBytes = await createPlaceholderPdf(file.name, 'Word Document');
    } else if (
      fileName.endsWith('.pptx') || 
      fileName.endsWith('.ppt') ||
      fileType.includes('presentationml') ||
      fileType === 'application/vnd.ms-powerpoint'
    ) {
      console.log("Convert-to-PDF: Creating placeholder for PowerPoint");
      pdfBytes = await createPlaceholderPdf(file.name, 'PowerPoint');
    } else {
      console.log(`Convert-to-PDF: Unsupported type: ${fileType}`);
      return new Response(
        JSON.stringify({ error: 'Unsupported file type. Supported: Images (PNG, JPG), TXT, DOCX, DOC, PPTX, PPT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Convert-to-PDF: Success, PDF size: ${pdfBytes.length}`);

    // Return the PDF as base64
    const base64Pdf = btoa(String.fromCharCode(...pdfBytes));
    
    return new Response(
      JSON.stringify({ 
        pdf: base64Pdf,
        originalName: file.name,
        convertedName: file.name.replace(/\.[^/.]+$/, '.pdf')
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Convert-to-PDF: Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to convert file' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function convertImageToPdf(imageBytes: Uint8Array, imageType: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  let image;
  if (imageType === 'image/png') {
    image = await pdfDoc.embedPng(imageBytes);
  } else if (imageType === 'image/jpeg' || imageType === 'image/jpg') {
    image = await pdfDoc.embedJpg(imageBytes);
  } else {
    // Try as JPEG for other image types
    try {
      image = await pdfDoc.embedJpg(imageBytes);
    } catch {
      image = await pdfDoc.embedPng(imageBytes);
    }
  }

  const { width, height } = image;
  
  // Scale to fit standard page size while maintaining aspect ratio
  const maxWidth = 595; // A4 width in points
  const maxHeight = 842; // A4 height in points
  const margin = 40;
  
  const availableWidth = maxWidth - (margin * 2);
  const availableHeight = maxHeight - (margin * 2);
  
  let scaledWidth = width;
  let scaledHeight = height;
  
  if (width > availableWidth || height > availableHeight) {
    const widthRatio = availableWidth / width;
    const heightRatio = availableHeight / height;
    const ratio = Math.min(widthRatio, heightRatio);
    scaledWidth = width * ratio;
    scaledHeight = height * ratio;
  }

  const page = pdfDoc.addPage([maxWidth, maxHeight]);
  
  const x = (maxWidth - scaledWidth) / 2;
  const y = (maxHeight - scaledHeight) / 2;
  
  page.drawImage(image, {
    x,
    y,
    width: scaledWidth,
    height: scaledHeight,
  });

  return await pdfDoc.save();
}

async function convertTextToPdf(text: string, fileName: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const fontSize = 11;
  const titleSize = 14;
  const lineHeight = fontSize * 1.4;
  const margin = 50;
  const pageWidth = 595;
  const pageHeight = 842;
  const maxLineWidth = pageWidth - (margin * 2);

  // Split text into lines
  const lines = text.split('\n');
  const wrappedLines: string[] = [];
  
  for (const line of lines) {
    if (line.trim() === '') {
      wrappedLines.push('');
      continue;
    }
    
    // Word wrap
    const words = line.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (textWidth > maxLineWidth) {
        if (currentLine) wrappedLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) wrappedLines.push(currentLine);
  }

  // Create pages
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Add title
  page.drawText(fileName.replace(/\.[^/.]+$/, ''), {
    x: margin,
    y: y,
    size: titleSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= titleSize * 2;

  // Add content
  for (const line of wrappedLines) {
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    
    if (line) {
      page.drawText(line, {
        x: margin,
        y: y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
    y -= lineHeight;
  }

  return await pdfDoc.save();
}

// Removed convertDocxToPdf - now handled directly in main handler

async function createPlaceholderPdf(fileName: string, fileType: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const page = pdfDoc.addPage([595, 842]);
  const { height } = page.getSize();

  page.drawText('Converted Document', {
    x: 50,
    y: height - 80,
    size: 24,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page.drawText(`Original File: ${fileName}`, {
    x: 50,
    y: height - 130,
    size: 12,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText(`File Type: ${fileType}`, {
    x: 50,
    y: height - 155,
    size: 12,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText('Note: This document was converted to PDF format.', {
    x: 50,
    y: height - 200,
    size: 11,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawText('For best results with complex documents, please use', {
    x: 50,
    y: height - 230,
    size: 11,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawText('a dedicated document converter before uploading.', {
    x: 50,
    y: height - 250,
    size: 11,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  return await pdfDoc.save();
}
