import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type LectureNote = Tables<"lecture_notes">;

export function useLectureNotes(courseId?: string) {
  const [notes, setNotes] = useState<LectureNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchNotes();
    }
  }, [courseId]);

  const fetchNotes = async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("lecture_notes")
        .select(`
          *,
          profiles!lecture_notes_uploaded_by_fkey (
            avatar_url
          )
        `)
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const formattedNotes = (data || []).map((note) => ({
        ...note,
        uploader_avatar: (note.profiles as any)?.avatar_url || null,
      }));

      setNotes(formattedNotes as any);
    } catch (err) {
      console.error("Error fetching lecture notes:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch lecture notes");
    } finally {
      setLoading(false);
    }
  };

  const convertToPdf = async (file: File): Promise<File | null> => {
    try {
      setConverting(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const formData = new FormData();
      formData.append('file', file);

      // Add timeout for conversion request (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/convert-to-pdf`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Conversion failed');
      }

      const data = await response.json();
      
      // Convert base64 to File
      const binaryString = atob(data.pdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const pdfBlob = new Blob([bytes], { type: 'application/pdf' });
      const pdfFile = new File([pdfBlob], data.convertedName, { type: 'application/pdf' });
      
      return pdfFile;
    } catch (err) {
      console.error("Error converting file:", err);
      if (err instanceof Error && err.name === 'AbortError') {
        toast.error("Conversion timed out. Please try a smaller file or upload a PDF directly.");
      } else {
        const errorMessage = err instanceof Error ? err.message : "Failed to convert file";
        toast.error(errorMessage);
      }
      return null;
    } finally {
      setConverting(false);
    }
  };

  const uploadNote = async (
    courseId: string,
    courseCode: string,
    departmentName: string,
    file: File,
    title: string,
    displayName: string
  ) => {
    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate file type
      if (file.type !== "application/pdf") {
        throw new Error("Only PDF files are allowed");
      }

      // Validate file size (25MB limit)
      const maxSize = 25 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error("File size must be less than 25MB");
      }

      // Check total storage limit (300MB)
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_storage_used")
        .eq("id", user.id)
        .single();

      const currentStorage = profile?.total_storage_used || 0;
      const storageLimit = 300 * 1024 * 1024;

      if (currentStorage + file.size > storageLimit) {
        throw new Error("Storage limit exceeded. Maximum 300MB per account.");
      }

      // Generate file path
      const fileExt = "pdf";
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${departmentName}/${courseCode}/lecture_notes/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("school_pdfs")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Insert into database
      const { error: insertError } = await supabase
        .from("lecture_notes")
        .insert({
          course_id: courseId,
          uploaded_by: user.id,
          uploaded_by_display: displayName,
          file_path: filePath,
          title,
          file_size: file.size,
        });

      if (insertError) throw insertError;

      // Update user storage
      await supabase.rpc("update_user_storage", {
        p_user_id: user.id,
        p_size_delta: file.size,
      });

      toast.success("Lecture note uploaded successfully!");
      await fetchNotes();
      
      return true;
    } catch (err) {
      console.error("Error uploading lecture note:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to upload lecture note";
      toast.error(errorMessage);
      return false;
    } finally {
      setUploading(false);
    }
  };

  const incrementViews = async (noteId: string) => {
    try {
      const { data: note } = await supabase
        .from("lecture_notes")
        .select("views")
        .eq("id", noteId)
        .single();

      if (note) {
        await supabase
          .from("lecture_notes")
          .update({ views: (note.views || 0) + 1 })
          .eq("id", noteId);
      }
    } catch (err) {
      console.error("Error incrementing views:", err);
    }
  };

  const getSignedUrl = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("school_pdfs")
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      console.error("Error getting signed URL:", err);
      return null;
    }
  };

  return {
    notes,
    loading,
    error,
    uploading,
    converting,
    uploadNote,
    convertToPdf,
    incrementViews,
    getSignedUrl,
    refresh: fetchNotes,
  };
}
