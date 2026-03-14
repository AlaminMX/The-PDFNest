import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CommunityUpload {
  id: string;
  user_id: string;
  faculty_id: string | null;
  department_id: string | null;
  course_id: string | null;
  level: number;
  semester: string;
  title: string;
  description: string | null;
  material_type: string;
  file_path: string;
  original_file_name: string;
  file_size: number;
  file_hash: string | null;
  status: string;
  reviewed_by: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  // Joined fields
  uploader_name?: string;
  department_name?: string;
  course_code?: string;
  course_name?: string;
}

interface UseUploadsOptions {
  /** Scope: 'own' = current user's uploads, 'admin' = all, 'rep' = own department */
  scope: "own" | "admin" | "rep";
  departmentId?: string | null;
  statusFilter?: "pending" | "approved" | "rejected" | "all";
}

export function useCommunityUploads({
  scope,
  departmentId,
  statusFilter = "pending",
}: UseUploadsOptions) {
  const [uploads, setUploads] = useState<CommunityUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUploads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // NOTE: community_uploads.user_id has no FK to profiles, so we cannot
      // use a Supabase join hint for the uploader name. Instead we join only
      // the tables that DO have FK constraints: departments, courses.
      let query = supabase
        .from("community_uploads")
        .select(
          `*,
          departments!community_uploads_department_id_fkey (name),
          courses!community_uploads_course_id_fkey (code, name)`
        )
        .order("created_at", { ascending: false });

      if (scope === "own") {
        query = query.eq("user_id", user.id);
      } else if (scope === "rep" && departmentId) {
        query = query.eq("department_id", departmentId);
      }
      // admin: no extra filter — RLS allows all

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const rows = data || [];

      // Fetch uploader display names in one batched query
      const userIds = [...new Set(rows.map((r: any) => r.user_id as string))];
      let nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);
        (profiles || []).forEach((p: any) => {
          nameMap[p.id] = p.display_name || "Unknown";
        });
      }

      const mapped: CommunityUpload[] = rows.map((row: any) => ({
        ...row,
        uploader_name: nameMap[row.user_id] || "Unknown",
        department_name: row.departments?.name || "Unknown",
        course_code: row.courses?.code || "",
        course_name: row.courses?.name || "",
      }));

      setUploads(mapped);
    } catch (err: any) {
      console.error("useCommunityUploads error:", err);
      setError(err.message || "Failed to load uploads");
    } finally {
      setLoading(false);
    }
  }, [scope, departmentId, statusFilter]);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const approveUpload = async (uploadId: string, note?: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { error } = await supabase.rpc("approve_community_upload", {
      p_upload_id: uploadId,
      p_reviewer_id: user.id,
      p_note: note || null,
    });
    if (error) throw error;
    await fetchUploads();
  };

  const rejectUpload = async (uploadId: string, note?: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { error } = await supabase.rpc("reject_community_upload", {
      p_upload_id: uploadId,
      p_reviewer_id: user.id,
      p_note: note || null,
    });
    if (error) throw error;
    await fetchUploads();
  };

  const deleteUpload = async (uploadId: string) => {
    const { error } = await supabase
      .from("community_uploads")
      .delete()
      .eq("id", uploadId);
    if (error) throw error;
    await fetchUploads();
  };

  return {
    uploads,
    loading,
    error,
    refetch: fetchUploads,
    approveUpload,
    rejectUpload,
    deleteUpload,
  };
}
