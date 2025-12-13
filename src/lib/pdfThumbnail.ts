import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker using CDN for version 5.x
// pdfjs-dist v5 uses different worker path structure
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.394/build/pdf.worker.min.mjs';

/**
 * Generate a thumbnail image from the first page of a PDF file
 * @param file - The PDF file to generate a thumbnail from
 * @param maxWidth - Maximum width of the thumbnail (default: 200px)
 * @returns A Blob containing the thumbnail image
 */
export async function generatePDFThumbnail(file: File, maxWidth: number = 200): Promise<Blob> {
  try {
    console.log('[PDF Thumbnail] Starting generation for:', file.name);
    console.log('[PDF Thumbnail] Worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    
    // Read the file as an array buffer
    const arrayBuffer = await file.arrayBuffer();
    console.log('[PDF Thumbnail] File read, size:', arrayBuffer.byteLength);
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    console.log('[PDF Thumbnail] PDF loaded, pages:', pdf.numPages);
    
    // Get the first page
    const page = await pdf.getPage(1);
    console.log('[PDF Thumbnail] Got first page');
    
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
    console.log('[PDF Thumbnail] Canvas size:', canvas.width, 'x', canvas.height);
    
    // Render PDF page to canvas
    const renderTask = page.render({
      canvasContext: context,
      viewport: scaledViewport,
    });
    await renderTask.promise;
    console.log('[PDF Thumbnail] Render complete');
    
    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('[PDF Thumbnail] Blob created, size:', blob.size);
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
    console.error('[PDF Thumbnail] Error generating thumbnail:', error);
    throw error;
  }
}
