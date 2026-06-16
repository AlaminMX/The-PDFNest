import * as pdfjs from "pdfjs-dist";
import { supabase } from "@/integrations/supabase/client";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export async function renderPdfFirstPageThumbnail(file: File, maxWidth = 420): Promise<Blob> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(maxWidth / viewport.width, 1.2);
    const scaledViewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available");

    canvas.width = Math.floor(scaledViewport.width);
    canvas.height = Math.floor(scaledViewport.height);
    await page.render({ canvasContext: context, viewport: scaledViewport }).promise;

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not generate PDF thumbnail"));
      }, "image/jpeg", 0.86);
    });
  } finally {
    pdf.destroy();
  }
}

export async function uploadStandaloneThumbnail(file: File, documentId: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const thumbnail = await renderPdfFirstPageThumbnail(file);
    const path = `${user.id}/standalone-documents/${documentId}.jpg`;
    const { error } = await supabase.storage
      .from("pdf-thumbnails")
      .upload(path, thumbnail, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;
    return path;
  } catch (error) {
    console.error("Failed to generate standalone document thumbnail:", error);
    return null;
  }
}

export async function getThumbnailSignedUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("pdf-thumbnails").createSignedUrl(path, 3600);
  if (error) {
    console.error("Failed to sign standalone thumbnail:", error);
    return null;
  }
  return data.signedUrl;
}
