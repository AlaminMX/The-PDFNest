import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logActivity } from "@/lib/sessionLogger";
import { uploadManager, UploadItem } from "@/lib/uploadManager";
import { cachePDF, getCachedPDF, getAllCachedIds, removeCachedPDF, isOffline, saveFileListForOffline, getOfflineFileList, type OfflineFileMetadata } from "@/lib/offlineStorage";

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
  isOfflineAvailable?: boolean;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: "uploading" | "complete" | "error" | "cancelled";
}

const PAGE_SIZE = 30;

export function usePDFFiles(userId: string | undefined) {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const pageRef = useRef(0);
  const allLoadedRef = useRef(false);

  // Subscribe to upload manager
  useEffect(() => {
    if (userId) {
      uploadManager.setUserId(userId);
      uploadManager.setOnComplete(() => {
        // Reset and reload after upload completes
        resetAndLoad();
      });
    }
    const unsub = uploadManager.subscribe(setUploadItems);
    return unsub;
  }, [userId]);

  // Load cached IDs on mount
  useEffect(() => {
    getAllCachedIds().then(setCachedIds);
  }, []);

  const loadFiles = useCallback(async (page: number, append: boolean = false) => {
    if (!userId) return;

    // If offline, load from cached metadata
    if (isOffline()) {
      const offlineFiles = getOfflineFileList();
      const filesWithOfflineFlag: PDFFile[] = offlineFiles
        .filter((f) => cachedIds.has(f.id))
        .map((f) => ({
          ...f,
          url: undefined,
          isOfflineAvailable: true,
        }));
      setFiles(filesWithOfflineFlag);
      setHasMore(false);
      setLoading(false);
      return;
    }

    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("pdf_files")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const records = data || [];
      const moreAvailable = records.length === PAGE_SIZE;
      setHasMore(moreAvailable);

      // Get signed URLs in parallel
      const filesWithUrls = await Promise.all(
        records.map(async (file) => {
          const { data: urlData } = await supabase.storage
            .from("pdfs")
            .createSignedUrl(file.storage_path, 3600);

          return {
            ...file,
            url: urlData?.signedUrl,
            thumbnail_url: null as string | null,
            isOfflineAvailable: cachedIds.has(file.id),
          };
        })
      );

      if (append) {
        setFiles((prev) => {
          const combined = [...prev, ...filesWithUrls];
          // Persist metadata for offline use
          saveFileListForOffline(combined.map(({ url, isOfflineAvailable, ...rest }) => rest));
          return combined;
        });
      } else {
        setFiles(filesWithUrls);
        // Persist metadata for offline use
        saveFileListForOffline(filesWithUrls.map(({ url, isOfflineAvailable, ...rest }) => rest));
      }
    } catch (error: any) {
      if (!isOffline()) {
        toast.error("Failed to load files");
      } else {
        // Fallback to offline list on network error
        const offlineFiles = getOfflineFileList();
        const filesWithOfflineFlag: PDFFile[] = offlineFiles
          .filter((f) => cachedIds.has(f.id))
          .map((f) => ({
            ...f,
            url: undefined,
            isOfflineAvailable: true,
          }));
        setFiles(filesWithOfflineFlag);
        setHasMore(false);
      }
      console.error("Error loading files:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, cachedIds]);

  const resetAndLoad = useCallback(async () => {
    pageRef.current = 0;
    allLoadedRef.current = false;
    setHasMore(true);
    await loadFiles(0, false);
  }, [loadFiles]);

  // Initial load
  useEffect(() => {
    if (userId) {
      pageRef.current = 0;
      loadFiles(0, false);
    }
  }, [userId, loadFiles]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    pageRef.current += 1;
    setLoading(true);
    await loadFiles(pageRef.current, true);
  }, [hasMore, loading, loadFiles]);

  const uploadFile = async (file: File, categoryId: string | null) => {
    uploadManager.addFiles([file], categoryId);
  };

  const uploadFiles = async (fileList: File[], categoryId: string | null) => {
    uploadManager.addFiles(fileList, categoryId);
  };

  // Cache a PDF for offline access
  const cacheForOffline = useCallback(async (fileId: string, url: string, fileName: string) => {
    try {
      // Check if already cached
      const existing = await getCachedPDF(fileId);
      if (existing) {
        // Already cached - make sure UI reflects it
        setCachedIds((prev) => new Set(prev).add(fileId));
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, isOfflineAvailable: true } : f
          )
        );
        return;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      await cachePDF(fileId, blob, fileName);
      
      setCachedIds((prev) => new Set(prev).add(fileId));
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, isOfflineAvailable: true } : f
        )
      );
    } catch (err) {
      console.warn("Failed to cache PDF for offline:", err);
      toast.error("Failed to save PDF offline");
    }
  }, []);

  const deleteFile = async (fileId: string, storagePath: string) => {
    if (!userId) return;

    try {
      const { data: fileData } = await supabase
        .from("pdf_files")
        .select("thumbnail_url, file_size")
        .eq("id", fileId)
        .single();

      const { error: storageError } = await supabase.storage
        .from("pdfs")
        .remove([storagePath]);

      if (storageError) throw storageError;

      if (fileData?.thumbnail_url) {
        await supabase.storage
          .from("pdf-thumbnails")
          .remove([fileData.thumbnail_url]);
      }

      const { error: dbError } = await supabase
        .from("pdf_files")
        .delete()
        .eq("id", fileId);

      if (dbError) throw dbError;

      await logActivity("delete_pdf", { fileName: storagePath });

      if (fileData?.file_size) {
        await supabase.rpc("update_user_storage", {
          p_user_id: userId,
          p_size_delta: -fileData.file_size,
        });
      }

      // Remove from offline cache
      await removeCachedPDF(fileId);
      setCachedIds((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });

      // Remove from local state immediately
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
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

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, category_id: categoryId === "uncategorized" ? null : categoryId }
            : f
        )
      );
    } catch (error: any) {
      toast.error("Failed to update file category");
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

      await logActivity("rename_pdf", { fileId, newName });

      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, name: newName } : f))
      );
      toast.success("File renamed successfully");
    } catch (error: any) {
      toast.error("Failed to rename file");
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

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, is_favorite: !currentState } : f
        )
      );
      toast.success(currentState ? "Removed from favorites" : "Added to favorites");
    } catch (error: any) {
      toast.error("Failed to update favorite");
    }
  };

  // Convert legacy uploadProgress format for backward compat
  const uploadProgress = new Map<string, UploadProgress>();
  for (const item of uploadItems) {
    uploadProgress.set(item.id, {
      fileName: item.fileName,
      progress: item.progress,
      status:
        item.status === "success"
          ? "complete"
          : item.status === "failed"
          ? "error"
          : "uploading",
    });
  }

  const cancelUpload = (id: string) => {
    uploadManager.remove(id);
    toast.info("Upload removed from queue");
  };

  const retryUpload = (id: string) => {
    uploadManager.retry(id);
  };

  return {
    files,
    loading,
    hasMore,
    loadMore,
    uploadFile,
    uploadFiles,
    deleteFile,
    updateFileCategory,
    renameFile,
    toggleFavorite,
    uploadProgress,
    cancelUpload,
    retryUpload,
    refreshFiles: resetAndLoad,
    cacheForOffline,
  };
}
