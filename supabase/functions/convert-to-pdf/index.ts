import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import mammoth from "https://esm.sh/mammoth@1.6.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

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
      fileType.includes('wordprocessingml')
    ) {
      console.log("Convert-to-PDF: Converting DOCX file");
      pdfBytes = await convertDocxToPdf(arrayBuffer, file.name);
    } else if (
      fileName.endsWith('.doc') ||
      fileType === 'application/msword'
    ) {
      // Legacy .doc format - extract what we can or create info page
      console.log("Convert-to-PDF: Legacy DOC format - attempting text extraction");
      pdfBytes = await convertLegacyDocToPdf(uint8Array, file.name);
    } else if (
      fileName.endsWith('.pptx') || 
      fileName.endsWith('.ppt') ||
      fileType.includes('presentationml') ||
      fileType === 'application/vnd.ms-powerpoint'
    ) {
      console.log("Convert-to-PDF: Converting PowerPoint");
      pdfBytes = await convertPptxToPdf(arrayBuffer, file.name);
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

async function convertDocxToPdf(arrayBuffer: ArrayBuffer, fileName: string): Promise<Uint8Array> {
  try {
    console.log("Converting DOCX using mammoth...");
    
    // Extract text from DOCX using mammoth
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;
    
    if (!text || text.trim().length === 0) {
      console.log("No text extracted from DOCX, trying alternative method...");
      // Fallback: try to extract from XML directly
      const extractedText = await extractTextFromDocxZip(arrayBuffer);
      if (extractedText && extractedText.trim().length > 0) {
        return await convertTextToPdf(extractedText, fileName);
      }
      throw new Error("Could not extract any text from the document");
    }
    
    console.log(`Extracted ${text.length} characters from DOCX`);
    
    // Convert the extracted text to PDF
    return await convertTextToPdf(text, fileName);
  } catch (error) {
    console.error("DOCX conversion error:", error);
    // Fallback: try direct XML extraction
    try {
      const extractedText = await extractTextFromDocxZip(arrayBuffer);
      if (extractedText && extractedText.trim().length > 0) {
        return await convertTextToPdf(extractedText, fileName);
      }
    } catch (fallbackError) {
      console.error("Fallback extraction also failed:", fallbackError);
    }
    throw new Error(`Failed to convert DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractTextFromDocxZip(arrayBuffer: ArrayBuffer): Promise<string> {
  console.log("Attempting direct XML extraction from DOCX...");
  
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // DOCX stores content in word/document.xml
  const documentXml = zip.file("word/document.xml");
  if (!documentXml) {
    throw new Error("Could not find document.xml in DOCX");
  }
  
  const xmlContent = await documentXml.async("text");
  
  // Extract text from XML - simple approach
  // Remove all XML tags and decode entities
  let text = xmlContent
    // Extract text from <w:t> tags (Word text elements)
    .replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, '$1')
    // Handle paragraph breaks
    .replace(/<\/w:p>/g, '\n')
    // Remove remaining XML tags
    .replace(/<[^>]+>/g, '')
    // Decode common XML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // Clean up extra whitespace
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
  
  console.log(`Extracted ${text.length} characters via XML parsing`);
  return text;
}

async function convertLegacyDocToPdf(uint8Array: Uint8Array, fileName: string): Promise<Uint8Array> {
  // Legacy .doc format is binary and complex - try to extract readable text
  try {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
    
    // Try to find readable text in the binary content
    // .doc files have text mixed with binary data
    const cleanText = text
      .split('')
      .filter(char => {
        const code = char.charCodeAt(0);
        // Keep printable ASCII and common extended chars
        return (code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9;
      })
      .join('')
      // Clean up multiple spaces and control chars
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
    
    if (cleanText.length > 100) {
      console.log(`Extracted ${cleanText.length} chars from legacy DOC`);
      return await convertTextToPdf(cleanText, fileName);
    }
  } catch (e) {
    console.error("Legacy DOC extraction failed:", e);
  }
  
  // If extraction fails, create an info page
  return await createInfoPdf(fileName, 'Legacy Word Document (.doc)', 
    'This legacy .doc format requires Microsoft Word or LibreOffice for full conversion. ' +
    'Please convert to .docx or PDF before uploading for best results.');
}

async function convertPptxToPdf(arrayBuffer: ArrayBuffer, fileName: string): Promise<Uint8Array> {
  try {
    console.log("Extracting text from PPTX...");
    
    const zip = await JSZip.loadAsync(arrayBuffer);
    const slides: string[] = [];
    
    // Find all slide XML files
    const slideFiles = Object.keys(zip.files)
      .filter(name => name.match(/ppt\/slides\/slide\d+\.xml/))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
        const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
        return numA - numB;
      });
    
    console.log(`Found ${slideFiles.length} slides`);
    
    for (const slidePath of slideFiles) {
      const slideFile = zip.file(slidePath);
      if (slideFile) {
        const xmlContent = await slideFile.async("text");
        
        // Extract text from <a:t> tags (PowerPoint text elements)
        const slideText = xmlContent
          .replace(/<a:t>([^<]*)<\/a:t>/g, '$1 ')
          .replace(/<\/a:p>/g, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (slideText) {
          slides.push(slideText);
        }
      }
    }
    
    if (slides.length === 0) {
      throw new Error("No text content found in presentation");
    }
    
    // Create PDF with slide content
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 50;
    const fontSize = 11;
    const titleSize = 14;
    const slideHeaderSize = 12;
    const lineHeight = fontSize * 1.4;
    const maxLineWidth = pageWidth - (margin * 2);
    
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;
    
    // Title
    const docTitle = fileName.replace(/\.[^/.]+$/, '');
    page.drawText(docTitle, {
      x: margin,
      y: y,
      size: titleSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= titleSize * 2;
    
    // Add each slide
    for (let i = 0; i < slides.length; i++) {
      // Check if we need a new page
      if (y < margin + lineHeight * 5) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      
      // Slide header
      page.drawText(`Slide ${i + 1}`, {
        x: margin,
        y: y,
        size: slideHeaderSize,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= slideHeaderSize * 1.5;
      
      // Slide content - word wrap
      const words = slides[i].split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (textWidth > maxLineWidth) {
          if (currentLine) {
            if (y < margin + lineHeight) {
              page = pdfDoc.addPage([pageWidth, pageHeight]);
              y = pageHeight - margin;
            }
            page.drawText(currentLine, {
              x: margin,
              y: y,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0),
            });
            y -= lineHeight;
          }
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      // Draw remaining text
      if (currentLine) {
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        page.drawText(currentLine, {
          x: margin,
          y: y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
        y -= lineHeight;
      }
      
      y -= lineHeight; // Extra space between slides
    }
    
    console.log(`Created PDF with ${slides.length} slides`);
    return await pdfDoc.save();
    
  } catch (error) {
    console.error("PPTX conversion error:", error);
    return await createInfoPdf(fileName, 'PowerPoint Presentation', 
      'Could not extract text content from this presentation. ' +
      'Please export to PDF from PowerPoint for best results.');
  }
}

async function createInfoPdf(fileName: string, fileType: string, message: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const page = pdfDoc.addPage([595, 842]);
  const { height } = page.getSize();

  page.drawText('Document Information', {
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

  // Word wrap the message
  const words = message.split(' ');
  let currentLine = '';
  let y = height - 200;
  const maxWidth = 495;
  const lineHeight = 16;
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = font.widthOfTextAtSize(testLine, 11);
    
    if (textWidth > maxWidth) {
      page.drawText(currentLine, {
        x: 50,
        y: y,
        size: 11,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= lineHeight;
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    page.drawText(currentLine, {
      x: 50,
      y: y,
      size: 11,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  return await pdfDoc.save();
}
