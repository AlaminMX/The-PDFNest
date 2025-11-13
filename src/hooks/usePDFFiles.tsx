import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PDFFile {
  id: string;
  name: string;
  file_name: string;
  file_size: number;
  storage_path: string;
  category_id: string | null;
  created_at: string;
  url?: string;
}

export function usePDFFiles(userId: string | undefined) {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFiles = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("pdf_files")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get signed URLs for each file
      const filesWithUrls = await Promise.all(
        (data || []).map(async (file) => {
          const { data: urlData } = await supabase.storage
            .from("pdfs")
            .createSignedUrl(file.storage_path, 3600);

          return {
            ...file,
            url: urlData?.signedUrl,
          };
        })
      );

      setFiles(filesWithUrls);
    } catch (error: any) {
      toast.error("Failed to load files");
      console.error("Error loading files:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [userId]);

  const uploadFile = async (file: File, categoryId: string | null) => {
    if (!userId) return;

    try {
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${userId}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("pdfs")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { error: dbError } = await supabase.from("pdf_files").insert({
        user_id: userId,
        name: file.name,
        file_name: fileName,
        file_size: file.size,
        storage_path: filePath,
        category_id: categoryId === "uncategorized" ? null : categoryId,
      });

      if (dbError) throw dbError;

      await loadFiles();
      toast.success("File uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload file");
      console.error("Error uploading file:", error);
    }
  };

  const deleteFile = async (fileId: string, storagePath: string) => {
    if (!userId) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("pdfs")
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("pdf_files")
        .delete()
        .eq("id", fileId);

      if (dbError) throw dbError;

      await loadFiles();
      toast.success("File deleted");
    } catch (error: any) {
      toast.error("Failed to delete file");
      console.error("Error deleting file:", error);
    }
  };

  const updateFileCategory = async (fileId: string, categoryId: string | null) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("pdf_files")
        .update({ category_id: categoryId === "uncategorized" ? null : categoryId })
        .eq("id", fileId);

      if (error) throw error;

      await loadFiles();
    } catch (error: any) {
      toast.error("Failed to update file category");
      console.error("Error updating file category:", error);
    }
  };

  const renameFile = async (fileId: string, newName: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("pdf_files")
        .update({ name: newName })
        .eq("id", fileId);

      if (error) throw error;

      await loadFiles();
      toast.success("File renamed successfully");
    } catch (error: any) {
      toast.error("Failed to rename file");
      console.error("Error renaming file:", error);
    }
  };

  return { files, loading, uploadFile, deleteFile, updateFileCategory, renameFile, refreshFiles: loadFiles };
}
