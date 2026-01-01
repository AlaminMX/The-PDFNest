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

// Load PDFNest logo as base64
async function loadLogoAsBase64(): Promise<string | null> {
  try {
    const response = await fetch('/pdfnest-logo.png');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading logo:', error);
    return null;
  }
}

// Text replacement map for unsupported characters in standard fonts
// This handles characters that might not render well in standard PDF fonts
function sanitizeText(text: string): string {
  // Replace common problematic Unicode characters with alternatives
  // Math symbols
  const replacements: Record<string, string> = {
    '≈': '~=',
    '≠': '!=',
    '≤': '<=',
    '≥': '>=',
    '±': '+/-',
    '÷': '/',
    '×': 'x',
    '∞': 'infinity',
    '√': 'sqrt',
    '∑': 'SUM',
    '∏': 'PROD',
    '∫': 'integral',
    '∂': 'd',
    '∆': 'delta',
    '∇': 'nabla',
    '∈': 'in',
    '∉': 'not in',
    '⊂': 'subset',
    '⊃': 'superset',
    '∪': 'union',
    '∩': 'intersection',
    '∧': 'AND',
    '∨': 'OR',
    '¬': 'NOT',
    '⇒': '=>',
    '⇔': '<=>',
    '∀': 'for all',
    '∃': 'exists',
    'α': 'alpha',
    'β': 'beta',
    'γ': 'gamma',
    'δ': 'delta',
    'ε': 'epsilon',
    'θ': 'theta',
    'λ': 'lambda',
    'μ': 'mu',
    'π': 'pi',
    'σ': 'sigma',
    'φ': 'phi',
    'ω': 'omega',
    '→': '->',
    '←': '<-',
    '↔': '<->',
    '°': 'deg',
  };

  // Common emoji replacements - using text descriptions
  const emojiReplacements: Record<string, string> = {
    '✓': '[check]',
    '✔': '[check]',
    '✗': '[x]',
    '✘': '[x]',
    '★': '[star]',
    '☆': '[star]',
    '❤': '[heart]',
    '♥': '[heart]',
    '⭐': '[star]',
    '🔥': '[fire]',
    '💡': '[idea]',
    '📌': '[pin]',
    '📝': '[note]',
    '📚': '[books]',
    '📖': '[book]',
    '✨': '[sparkle]',
    '🎯': '[target]',
    '💪': '[strong]',
    '👍': '[thumbs up]',
    '👎': '[thumbs down]',
    '🚀': '[rocket]',
    '⚡': '[lightning]',
    '🔑': '[key]',
    '🔒': '[lock]',
    '🔓': '[unlock]',
    '⚠': '[warning]',
    '❗': '[!]',
    '❓': '[?]',
    '💰': '[money]',
    '📈': '[chart up]',
    '📉': '[chart down]',
    '✅': '[done]',
    '❌': '[x]',
    '🔴': '[red]',
    '🟢': '[green]',
    '🟡': '[yellow]',
    '🔵': '[blue]',
    '⬛': '[black]',
    '⬜': '[white]',
    '▶': '>',
    '◀': '<',
    '▲': '^',
    '▼': 'v',
    '◆': '*',
    '◇': '*',
    '○': 'o',
    '●': '*',
    '□': '[ ]',
    '■': '[x]',
  };

  let result = text;

  // Apply replacements
  for (const [char, replacement] of Object.entries(replacements)) {
    result = result.split(char).join(replacement);
  }
  
  for (const [emoji, replacement] of Object.entries(emojiReplacements)) {
    result = result.split(emoji).join(replacement);
  }

  // Remove remaining emojis that we can't handle
  // eslint-disable-next-line no-misleading-character-class
  result = result.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F1FF}]|[\u{1F200}-\u{1F2FF}]|[\u{1FA00}-\u{1FAFF}]/gu, '');

  return result;
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
  
  // Load logo
  const logoBase64 = await loadLogoAsBase64();
  
  // Colors based on type
  const colors = {
    summary: { r: 220, g: 38, b: 38 }, // Red
    'study-guide': { r: 34, g: 197, b: 94 }, // Green
    translation: { r: 59, g: 130, b: 246 }, // Blue
    chat: { r: 168, g: 85, b: 247 }, // Purple
  };
  
  const typeLabels = {
    summary: 'PDF Summary',
    'study-guide': 'Study Guide',
    translation: 'Translation',
    chat: 'Chat Export',
  };
  
  const accentColor = colors[type];
  
  // Header background with gradient effect (solid color fallback)
  doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Add subtle header overlay for depth
  doc.setFillColor(0, 0, 0);
  doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
  doc.rect(0, 40, pageWidth, 10, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  
  // Add logo if available
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', pageWidth - margin - 15, 8, 12, 12);
    } catch (e) {
      console.error('Error adding logo to PDF:', e);
    }
  }
  
  // Type badge
  doc.setFillColor(255, 255, 255);
  doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
  doc.roundedRect(margin, 8, 35, 6, 1, 1, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(typeLabels[type].toUpperCase(), margin + 2, 12);
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const sanitizedTitle = sanitizeText(title);
  const titleLines = doc.splitTextToSize(sanitizedTitle, contentWidth - 20);
  doc.text(titleLines[0], margin, 25);
  
  // Subtitle
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(sanitizeText(subtitle), margin, 33);
  }
  
  // Source file info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const truncatedSource = sourceFileName.length > 50 ? sourceFileName.substring(0, 47) + '...' : sourceFileName;
  doc.text(`Source: ${sanitizeText(truncatedSource)}`, margin, 42);
  
  // Generation date on right side
  const dateStr = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), 42);
  
  yPos = 60;
  
  // Decorative line under header
  doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
  doc.setLineWidth(0.5);
  doc.line(margin, 55, pageWidth - margin, 55);
  
  // Helper function to add a new page if needed
  const checkPageBreak = (requiredSpace: number = 20) => {
    if (yPos + requiredSpace > pageHeight - 25) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };
  
  // Helper to wrap and add text with improved formatting
  const addText = (text: string, fontSize: number, fontStyle: 'normal' | 'bold' | 'italic', lineHeight: number = 1.5) => {
    const sanitized = sanitizeText(text);
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(50, 50, 50);
    
    const lines = doc.splitTextToSize(sanitized, contentWidth);
    
    for (const line of lines) {
      checkPageBreak(fontSize * 0.4 * lineHeight);
      doc.text(line, margin, yPos);
      yPos += fontSize * 0.4 * lineHeight;
    }
  };
  
  // Process content with improved formatting
  const processContent = (contentStr: string) => {
    const lines = contentStr.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        yPos += 3;
        continue;
      }
      
      // Headers with styled backgrounds
      if (trimmedLine.startsWith('### ')) {
        checkPageBreak(15);
        yPos += 5;
        
        // Small accent bar
        doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
        doc.rect(margin, yPos - 4, 2, 6, 'F');
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text(sanitizeText(trimmedLine.replace('### ', '')), margin + 5, yPos);
        yPos += 8;
      } else if (trimmedLine.startsWith('## ')) {
        checkPageBreak(20);
        yPos += 8;
        
        // Colored background bar
        doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
        doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
        doc.rect(margin, yPos - 6, contentWidth, 10, 'F');
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
        
        // Accent bar
        doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
        doc.rect(margin, yPos - 6, 3, 10, 'F');
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
        doc.text(sanitizeText(trimmedLine.replace('## ', '')), margin + 6, yPos + 1);
        yPos += 12;
      } else if (trimmedLine.startsWith('# ')) {
        checkPageBreak(25);
        yPos += 10;
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text(sanitizeText(trimmedLine.replace('# ', '')), margin, yPos);
        yPos += 8;
        
        // Underline
        doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
        doc.setLineWidth(0.3);
        doc.line(margin, yPos, margin + 40, yPos);
        yPos += 4;
      }
      // Bullet points with proper styling
      else if (trimmedLine.startsWith('• ') || trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        checkPageBreak(12);
        
        // Colored bullet
        doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
        doc.circle(margin + 2, yPos - 1.5, 1.2, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        const bulletText = sanitizeText(trimmedLine.replace(/^[•\-*]\s*/, ''));
        const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 10);
        
        for (let j = 0; j < bulletLines.length; j++) {
          if (j > 0) {
            checkPageBreak(10);
          }
          doc.text(bulletLines[j], margin + 7, yPos);
          yPos += 5;
        }
        yPos += 1;
      }
      // Numbered items with accent color
      else if (/^\d+\.\s/.test(trimmedLine)) {
        checkPageBreak(12);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
        const numberMatch = trimmedLine.match(/^(\d+)\./);
        if (numberMatch) {
          // Number circle background
          doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
          doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
          doc.circle(margin + 3, yPos - 1, 3.5, 'F');
          doc.setGState(new (doc as any).GState({ opacity: 1 }));
          
          doc.text(numberMatch[1], margin + 1.5, yPos);
        }
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        const numberText = sanitizeText(trimmedLine.replace(/^\d+\.\s*/, ''));
        const numberLines = doc.splitTextToSize(numberText, contentWidth - 12);
        
        for (let j = 0; j < numberLines.length; j++) {
          if (j > 0) {
            checkPageBreak(10);
          }
          doc.text(numberLines[j], margin + 9, yPos);
          yPos += 5;
        }
        yPos += 1;
      }
      // Section markers (===)
      else if (trimmedLine.startsWith('===') && trimmedLine.endsWith('===')) {
        checkPageBreak(22);
        yPos += 10;
        
        const sectionTitle = sanitizeText(trimmedLine.replace(/=/g, '').trim());
        
        // Full-width section banner
        doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
        doc.rect(margin, yPos - 6, contentWidth, 12, 'F');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(sectionTitle.toUpperCase(), margin + 5, yPos + 2);
        yPos += 14;
      }
      // Code blocks or special content
      else if (trimmedLine.startsWith('```')) {
        // Skip code fence markers
        continue;
      }
      // Regular text with proper paragraph spacing
      else {
        addText(trimmedLine, 10, 'normal', 1.4);
        yPos += 2;
      }
    }
  };
  
  // Handle array of sections or single content string
  if (Array.isArray(content)) {
    for (let i = 0; i < content.length; i++) {
      const section = content[i];
      checkPageBreak(30);
      
      if (i > 0) {
        yPos += 8;
      }
      
      // Section header with full styling
      doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
      doc.rect(margin, yPos - 4, contentWidth, 10, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(sanitizeText(section.section.toUpperCase()), margin + 5, yPos + 2);
      yPos += 14;
      
      processContent(section.content);
    }
  } else {
    processContent(content);
  }
  
  // Footer on each page with branding
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
    
    // PDFNest branding
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
    doc.text('PDFNest', margin, pageHeight - 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('AI-Powered PDF Tools', margin + 16, pageHeight - 12);
    
    // Page number
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const pageText = `Page ${i} of ${totalPages}`;
    doc.text(pageText, pageWidth - margin - doc.getTextWidth(pageText), pageHeight - 12);
  }
  
  const blob = doc.output('blob');
  const fileName = `${sourceFileName.replace('.pdf', '')}-${type}-${Date.now()}.pdf`;
  
  return { blob, fileName };
}

// Get or create the "AI Exports" category for a user
async function getOrCreateAIExportsCategory(userId: string): Promise<string | null> {
  const AI_EXPORTS_CATEGORY_NAME = 'AI Exports';
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