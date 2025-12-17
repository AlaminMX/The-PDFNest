import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExportOptions {
  title: string;
  subtitle?: string;
  content: string | { section: string; content: string }[];
  type: 'summary' | 'study-guide' | 'translation' | 'chat';
  sourceFileName: string;
}

// Parse markdown-style formatting and return styled text segments
function parseContent(text: string): { text: string; bold: boolean; italic: boolean }[] {
  const segments: { text: string; bold: boolean; italic: boolean }[] = [];
  
  // Simple regex-based parsing for bold and italic
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|([^*]+)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // Bold text
      segments.push({ text: match[2], bold: true, italic: false });
    } else if (match[4]) {
      // Italic text
      segments.push({ text: match[4], bold: false, italic: true });
    } else if (match[5]) {
      // Regular text
      segments.push({ text: match[5], bold: false, italic: false });
    }
  }
  
  return segments.length > 0 ? segments : [{ text, bold: false, italic: false }];
}

export async function exportToPDF(options: ExportOptions): Promise<{ blob: Blob; fileName: string }> {
  const { title, subtitle, content, type, sourceFileName } = options;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;
  
  // Colors based on type
  const colors = {
    summary: { r: 220, g: 38, b: 38 }, // Red
    'study-guide': { r: 34, g: 197, b: 94 }, // Green
    translation: { r: 59, g: 130, b: 246 }, // Blue
    chat: { r: 168, g: 85, b: 247 }, // Purple
  };
  
  const accentColor = colors[type];
  
  // Header background
  doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, 20);
  
  // Subtitle
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, margin, 30);
  }
  
  // Source file info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  const truncatedSource = sourceFileName.length > 50 ? sourceFileName.substring(0, 47) + '...' : sourceFileName;
  doc.text(`Source: ${truncatedSource}`, margin, 38);
  
  yPos = 55;
  
  // Helper function to add a new page if needed
  const checkPageBreak = (requiredSpace: number = 20) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };
  
  // Helper to wrap and add text
  const addText = (text: string, fontSize: number, fontStyle: 'normal' | 'bold' | 'italic', lineHeight: number = 1.4) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(50, 50, 50);
    
    const lines = doc.splitTextToSize(text, contentWidth);
    
    for (const line of lines) {
      checkPageBreak(fontSize * 0.35 * lineHeight);
      doc.text(line, margin, yPos);
      yPos += fontSize * 0.35 * lineHeight;
    }
  };
  
  // Process content
  const processContent = (contentStr: string) => {
    const lines = contentStr.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        yPos += 4;
        continue;
      }
      
      // Headers
      if (trimmedLine.startsWith('### ')) {
        checkPageBreak(15);
        yPos += 4;
        addText(trimmedLine.replace('### ', ''), 12, 'bold');
        yPos += 2;
      } else if (trimmedLine.startsWith('## ')) {
        checkPageBreak(18);
        yPos += 6;
        doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
        doc.rect(margin, yPos - 4, 3, 8, 'F');
        addText(trimmedLine.replace('## ', ''), 14, 'bold');
        yPos += 3;
      } else if (trimmedLine.startsWith('# ')) {
        checkPageBreak(20);
        yPos += 8;
        addText(trimmedLine.replace('# ', ''), 16, 'bold');
        yPos += 4;
      }
      // Bullet points
      else if (trimmedLine.startsWith('• ') || trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        checkPageBreak(12);
        doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
        doc.circle(margin + 2, yPos - 1.5, 1, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        const bulletText = trimmedLine.replace(/^[•\-*]\s*/, '');
        const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 8);
        for (let i = 0; i < bulletLines.length; i++) {
          if (i > 0) checkPageBreak(10);
          doc.text(bulletLines[i], margin + 6, yPos);
          yPos += 5;
        }
      }
      // Numbered items
      else if (/^\d+\.\s/.test(trimmedLine)) {
        checkPageBreak(12);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
        const numberMatch = trimmedLine.match(/^(\d+)\./);
        if (numberMatch) {
          doc.text(numberMatch[1] + '.', margin, yPos);
        }
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        const numberText = trimmedLine.replace(/^\d+\.\s*/, '');
        const numberLines = doc.splitTextToSize(numberText, contentWidth - 8);
        for (let i = 0; i < numberLines.length; i++) {
          if (i > 0) checkPageBreak(10);
          doc.text(numberLines[i], margin + 6, yPos);
          yPos += 5;
        }
      }
      // Section markers (===)
      else if (trimmedLine.startsWith('===') && trimmedLine.endsWith('===')) {
        checkPageBreak(20);
        yPos += 8;
        const sectionTitle = trimmedLine.replace(/=/g, '').trim();
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos - 5, contentWidth, 10, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
        doc.text(sectionTitle, margin + 4, yPos + 1);
        yPos += 12;
      }
      // Regular text
      else {
        addText(trimmedLine, 10, 'normal');
        yPos += 2;
      }
    }
  };
  
  // Handle array of sections or single content string
  if (Array.isArray(content)) {
    for (const section of content) {
      checkPageBreak(25);
      yPos += 6;
      
      // Section header
      doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
      doc.rect(margin, yPos - 4, contentWidth, 8, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(section.section.toUpperCase(), margin + 4, yPos + 1);
      yPos += 12;
      
      processContent(section.content);
    }
  } else {
    processContent(content);
  }
  
  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated by PDFNest AI`, margin, pageHeight - 10);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
    doc.text(new Date().toLocaleDateString(), pageWidth / 2 - 10, pageHeight - 10);
  }
  
  const blob = doc.output('blob');
  const fileName = `${sourceFileName.replace('.pdf', '')}-${type}-${Date.now()}.pdf`;
  
  return { blob, fileName };
}

// Get or create the "AI Exports" category for a user
async function getOrCreateAIExportsCategory(userId: string): Promise<string | null> {
  const AI_EXPORTS_CATEGORY_NAME = '✨ AI Exports';
  const AI_EXPORTS_CATEGORY_COLOR = '#8B5CF6'; // Purple to match AI theme
  
  try {
    // Check if the category already exists
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', AI_EXPORTS_CATEGORY_NAME)
      .maybeSingle();
    
    if (existingCategory) {
      return existingCategory.id;
    }
    
    // Create the category if it doesn't exist
    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: AI_EXPORTS_CATEGORY_NAME,
        color: AI_EXPORTS_CATEGORY_COLOR
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating AI Exports category:', error);
      return null;
    }
    
    return newCategory.id;
  } catch (error) {
    console.error('Error getting/creating AI Exports category:', error);
    return null;
  }
}

export async function exportAndUpload(
  options: ExportOptions,
  userId: string,
  onProgress?: (status: string) => void
): Promise<boolean> {
  try {
    onProgress?.('Generating PDF...');
    
    const { blob, fileName } = await exportToPDF(options);
    
    onProgress?.('Uploading to your account...');
    
    // Get or create the AI Exports category
    const categoryId = await getOrCreateAIExportsCategory(userId);
    
    // Upload to storage
    const filePath = `${userId}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(filePath, blob, { contentType: 'application/pdf' });
    
    if (uploadError) throw uploadError;
    
    // Create database record with AI Exports category
    const { error: dbError } = await supabase.from('pdf_files').insert({
      user_id: userId,
      name: fileName,
      file_name: fileName,
      file_size: blob.size,
      storage_path: filePath,
      category_id: categoryId,
      thumbnail_url: null,
    });
    
    if (dbError) throw dbError;
    
    // Update storage usage
    await supabase.rpc('update_user_storage', {
      p_user_id: userId,
      p_size_delta: blob.size
    });
    
    // Also trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('PDF exported and saved to AI Exports');
    return true;
  } catch (error: any) {
    console.error('Export error:', error);
    toast.error('Failed to export PDF');
    return false;
  }
}
