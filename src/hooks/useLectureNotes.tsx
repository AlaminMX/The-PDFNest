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

      // Direct REST fetch — works for all users including guests
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/lecture_notes?course_id=eq.${courseId}&order=created_at.desc`;
      const res = await fetch(url, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      const notesData = res.ok ? await res.json() : [];
      const fetchError = res.ok ? null : new Error("Failed to fetch notes");

      if (fetchError) throw fetchError;

      // Get unique uploader IDs
      const uploaderIds = [...new Set((notesData || []).map((note: any) => note.uploaded_by))] as string[];
      
      // Fetch rep profiles for these uploaders
      let profilesMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      
      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("public_rep_profiles")
          .select("id, display_name, avatar_url")
          .in("id", uploaderIds);
        
        if (profiles) {
          profiles.forEach(profile => {
            if (profile.id) {
              profilesMap[profile.id] = {
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
              };
            }
          });
        }
      }

      const formattedNotes = (notesData || []).map((note) => ({
        ...note,
        uploader_avatar: profilesMap[note.uploaded_by]?.avatar_url || null,
        uploader_display_name: profilesMap[note.uploaded_by]?.display_name || note.uploaded_by_display,
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
    displayName: string,
    departmentId?: string,
    materialType: string = "lecture_note",
    storageDepartmentName?: string
  ) => {
    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate file type
      if (file.type !== "application/pdf") {
        throw new Error("Only PDF files are allowed");
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
      const storageFolderDepartmentName = storageDepartmentName || departmentName;
      const filePath = `${storageFolderDepartmentName}/${courseCode}/lecture_notes/${fileName}`;
      console.debug("uploadNote target", {
        targetDepartmentId: departmentId,
        targetDepartmentName: departmentName,
        targetCourseId: courseId,
        targetCourseCode: courseCode,
        storageFolderDepartmentName,
        materialType,
      });

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("school_pdfs")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Insert the lecture note via the secure RPC. It handles duplicate-title
      // numbering and enforces "rep must be in the same faculty as the target course".
      const { data: newNoteId, error: insertError } = await supabase.rpc(
        "rep_upload_lecture_note" as any,
        {
          _course_id: courseId,
          _file_path: filePath,
          _title: title,
          _file_size: file.size,
          _display_name: displayName,
          _material_type: materialType,
          _level: null,
        } as any,
      );

      if (insertError) {
        // Roll back the orphaned storage object so we don't accrue garbage.
        await supabase.storage.from("school_pdfs").remove([filePath]).catch(() => {});
        throw insertError;
      }

      // Update user storage
      await supabase.rpc("update_user_storage", {
        p_user_id: user.id,
        p_size_delta: file.size,
      });

      // Send notifications to department users (non-blocking)
      if (departmentId) {
        supabase.functions.invoke("notify-department-users", {
          body: {
            departmentId,
            courseCode,
            noteTitle: title,
            uploadedBy: displayName,
          },
        }).catch((err) => {
          console.error("Failed to send notifications:", err);
          // Don't throw - notification failure shouldn't block upload success
        });
      }

      await fetchNotes();

      return { success: true, noteId: newNoteId as string | null };
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

  const deleteNote = async (noteId: string, filePath: string, fileSize: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("school_pdfs")
        .remove([filePath]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
        // Continue anyway to delete database record
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from("lecture_notes")
        .delete()
        .eq("id", noteId);

      if (deleteError) throw deleteError;

      // Update user storage (subtract file size)
      await supabase.rpc("update_user_storage", {
        p_user_id: user.id,
        p_size_delta: -fileSize,
      });

      toast.success("Lecture note deleted successfully!");
      await fetchNotes();
      
      return true;
    } catch (err) {
      console.error("Error deleting lecture note:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to delete lecture note";
      toast.error(errorMessage);
      return false;
    }
  };

  const renameNote = async (noteId: string, newTitle: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!newTitle.trim()) {
        toast.error("Title cannot be empty");
        return false;
      }

      const { error: updateError } = await supabase
        .from("lecture_notes")
        .update({ title: newTitle.trim() })
        .eq("id", noteId)
        .eq("uploaded_by", user.id); // Ensure user owns the note

      if (updateError) throw updateError;

      toast.success("Title updated successfully!");
      await fetchNotes();
      
      return true;
    } catch (err) {
      console.error("Error renaming lecture note:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to rename lecture note";
      toast.error(errorMessage);
      return false;
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
    deleteNote,
    renameNote,
    refresh: fetchNotes,
  };
}
