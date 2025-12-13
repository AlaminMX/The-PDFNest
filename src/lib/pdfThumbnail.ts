import * as pdfjsLib from 'pdfjs-dist';

// PDF.js is configured to run without a separate worker for compatibility
// across environments. Rendering happens on the main thread.


/**
 * Generate a thumbnail image from the first page of a PDF file
 * @param file - The PDF file to generate a thumbnail from
 * @param maxWidth - Maximum width of the thumbnail (default: 200px)
 * @returns A Blob containing the thumbnail image
 */
export async function generatePDFThumbnail(file: File, maxWidth: number = 200): Promise<Blob> {
  try {
    // Read the file as an array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document (disable worker for compatibility)
    const loadingTask = (pdfjsLib as any).getDocument({ data: arrayBuffer, disableWorker: true });
    const pdf = await loadingTask.promise;
    
    // Get the first page
    const page = await pdf.getPage(1);
    
    // Calculate scale to fit within maxWidth
    const viewport = page.getViewport({ scale: 1 });
    const scale = maxWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    
    // Render PDF page to canvas
    const renderTask = page.render({
      canvasContext: context,
      viewport: scaledViewport,
    } as any);
    await renderTask.promise;
    
    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail blob'));
          }
        },
        'image/jpeg',
        0.85
      );
    });
  } catch (error) {
    console.error('Error generating PDF thumbnail:', error);
    throw error;
  }
}
