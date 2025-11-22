import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generatePDFThumbnail } from "@/lib/pdfThumbnail";

export interface PDFFile {
  id: string;
  name: string;
  file_name: string;
  file_size: number;
  storage_path: string;
  category_id: string | null;
  created_at: string;
  is_favorite: boolean;
  thumbnail_url: string | null;
  url?: string;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: "uploading" | "complete" | "error" | "cancelled";
}

export function usePDFFiles(userId: string | undefined) {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  const [uploadIntervals, setUploadIntervals] = useState<Map<string, NodeJS.Timeout>>(new Map());

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

          // Get thumbnail URL if it exists
          let thumbnailUrl = null;
          if (file.thumbnail_url) {
            const { data: thumbData } = await supabase.storage
              .from("pdf-thumbnails")
              .createSignedUrl(file.thumbnail_url, 3600);
            thumbnailUrl = thumbData?.signedUrl;
          }

          return {
            ...file,
            url: urlData?.signedUrl,
            thumbnail_url: thumbnailUrl,
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

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    // Validate file size (50MB limit)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('File size must be under 50MB');
      return;
    }

    // Check storage limit (300MB)
    const STORAGE_LIMIT = 300 * 1024 * 1024;
    const { data: profileData } = await supabase
      .from("profiles")
      .select("total_storage_used")
      .eq("id", userId)
      .single();

    const currentUsage = profileData?.total_storage_used || 0;
    if (currentUsage + file.size > STORAGE_LIMIT) {
      const remainingMB = Math.max(0, (STORAGE_LIMIT - currentUsage) / (1024 * 1024)).toFixed(1);
      toast.error(`Storage limit exceeded. You have ${remainingMB}MB remaining.`);
      return;
    }

    // Sanitize filename
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uploadId = `${Date.now()}-${sanitizedFileName}`;

    // Initialize upload progress
    setUploadProgress(prev => new Map(prev).set(uploadId, {
      fileName: sanitizedFileName,
      progress: 0,
      status: "uploading"
    }));

    try {
      const fileName = `${Date.now()}-${sanitizedFileName}`;
      const filePath = `${userId}/${fileName}`;

      // Simulate upload progress (Supabase storage doesn't provide real progress callbacks)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev.get(uploadId);
          if (current && current.status === "uploading" && current.progress < 90) {
            const newProgress = new Map(prev);
            newProgress.set(uploadId, { ...current, progress: current.progress + 10 });
            return newProgress;
          }
          return prev;
        });
      }, 200);

      setUploadIntervals(prev => new Map(prev).set(uploadId, progressInterval));

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("pdfs")
        .upload(filePath, file);

      clearInterval(progressInterval);
      setUploadIntervals(prev => {
        const newMap = new Map(prev);
        newMap.delete(uploadId);
        return newMap;
      });

      // Check if cancelled
      const currentProgress = uploadProgress.get(uploadId);
      if (currentProgress?.status === "cancelled") {
        return;
      }

      if (uploadError) throw uploadError;

      // Update progress to 90% while generating thumbnail
      setUploadProgress(prev => {
        const newProgress = new Map(prev);
        const current = prev.get(uploadId);
        if (current && current.status !== "cancelled") {
          newProgress.set(uploadId, { ...current, progress: 90 });
        }
        return newProgress;
      });

      // Generate and upload thumbnail
      let thumbnailPath = null;
      try {
        const thumbnailBlob = await generatePDFThumbnail(file);
        const thumbnailFileName = `${Date.now()}-thumb-${sanitizedFileName.replace('.pdf', '.jpg')}`;
        thumbnailPath = `${userId}/${thumbnailFileName}`;

        const { error: thumbError } = await supabase.storage
          .from("pdf-thumbnails")
          .upload(thumbnailPath, thumbnailBlob, {
            contentType: 'image/jpeg',
          });

        if (thumbError) {
          console.error("Failed to upload thumbnail:", thumbError);
          thumbnailPath = null; // Continue without thumbnail if it fails
        }
      } catch (thumbError) {
        console.error("Failed to generate thumbnail:", thumbError);
        // Continue without thumbnail
      }

      // Update progress to 95% while creating DB record
      setUploadProgress(prev => {
        const newProgress = new Map(prev);
        const current = prev.get(uploadId);
        if (current && current.status !== "cancelled") {
          newProgress.set(uploadId, { ...current, progress: 95 });
        }
        return newProgress;
      });

      // Create database record
      const { error: dbError } = await supabase.from("pdf_files").insert({
        user_id: userId,
        name: file.name,
        file_name: fileName,
        file_size: file.size,
        storage_path: filePath,
        category_id: categoryId === "uncategorized" ? null : categoryId,
        thumbnail_url: thumbnailPath,
      });

      if (dbError) throw dbError;

      // Update storage usage
      await supabase.rpc('update_user_storage', {
        p_user_id: userId,
        p_size_delta: file.size
      });

      // Complete upload
      setUploadProgress(prev => {
        const newProgress = new Map(prev);
        const current = prev.get(uploadId);
        if (current && current.status !== "cancelled") {
          newProgress.set(uploadId, { ...current, progress: 100, status: "complete" });
        }
        return newProgress;
      });

      // Remove from progress after 2 seconds
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = new Map(prev);
          newProgress.delete(uploadId);
          return newProgress;
        });
      }, 2000);

      await loadFiles();
      toast.success("File uploaded successfully");
    } catch (error: any) {
      const currentProgress = uploadProgress.get(uploadId);
      if (currentProgress?.status === "cancelled") {
        return;
      }

      setUploadProgress(prev => {
        const newProgress = new Map(prev);
        const current = prev.get(uploadId);
        if (current) {
          newProgress.set(uploadId, { ...current, status: "error" });
        }
        return newProgress;
      });

      toast.error("Failed to upload file");
      console.error("Error uploading file:", error);

      // Remove from progress after 3 seconds
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = new Map(prev);
          newProgress.delete(uploadId);
          return newProgress;
        });
      }, 3000);
    }
  };

  const cancelUpload = (uploadId: string) => {
    // Clear interval
    const interval = uploadIntervals.get(uploadId);
    if (interval) {
      clearInterval(interval);
      setUploadIntervals(prev => {
        const newMap = new Map(prev);
        newMap.delete(uploadId);
        return newMap;
      });
    }

    // Mark as cancelled
    setUploadProgress(prev => {
      const newProgress = new Map(prev);
      const current = prev.get(uploadId);
      if (current) {
        newProgress.set(uploadId, { ...current, status: "cancelled" });
      }
      return newProgress;
    });

    toast.info("Upload cancelled");

    // Remove after 2 seconds
    setTimeout(() => {
      setUploadProgress(prev => {
        const newProgress = new Map(prev);
        newProgress.delete(uploadId);
        return newProgress;
      });
    }, 2000);
  };

  const deleteFile = async (fileId: string, storagePath: string) => {
    if (!userId) return;

    try {
      // Get the file record to find thumbnail path and size
      const { data: fileData } = await supabase
        .from("pdf_files")
        .select("thumbnail_url, file_size")
        .eq("id", fileId)
        .single();

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("pdfs")
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete thumbnail if it exists
      if (fileData?.thumbnail_url) {
        await supabase.storage
          .from("pdf-thumbnails")
          .remove([fileData.thumbnail_url]);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("pdf_files")
        .delete()
        .eq("id", fileId);

      if (dbError) throw dbError;

      // Update storage usage
      if (fileData?.file_size) {
        await supabase.rpc('update_user_storage', {
          p_user_id: userId,
          p_size_delta: -fileData.file_size
        });
      }

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

  const toggleFavorite = async (fileId: string, currentState: boolean) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("pdf_files")
        .update({ is_favorite: !currentState })
        .eq("id", fileId);

      if (error) throw error;

      await loadFiles();
      toast.success(currentState ? "Removed from favorites" : "Added to favorites");
    } catch (error: any) {
      toast.error("Failed to update favorite");
      console.error("Error updating favorite:", error);
    }
  };

  return { files, loading, uploadFile, deleteFile, updateFileCategory, renameFile, toggleFavorite, uploadProgress, cancelUpload, refreshFiles: loadFiles };
}
