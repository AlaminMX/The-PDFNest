import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLogger";

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
  // Enriched fields (fetched separately — no fragile FK join hints)
  uploader_name?: string;
  department_name?: string;
  course_code?: string;
  course_name?: string;
}

interface UseUploadsOptions {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // ── Step 1: Fetch community_uploads rows — plain select, no joins ──
      let query = supabase
        .from("community_uploads")
        .select("*")
        .order("created_at", { ascending: false });

      if (scope === "own") {
        query = query.eq("user_id", user.id);
      } else if (scope === "rep" && departmentId) {
        query = query.eq("department_id", departmentId);
      }
      // scope === "admin": RLS "Admins can view all uploads" handles it

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const rows = (data || []) as CommunityUpload[];
      if (rows.length === 0) { setUploads([]); return; }

      // ── Step 2: Batch-fetch uploader display names ──────────────────
      const userIds = [...new Set(rows.map(r => r.user_id))];
      let nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, nickname")
          .in("id", userIds);
        (profiles || []).forEach((p: any) => {
          nameMap[p.id] = p.display_name || p.nickname || "Unknown";
        });
      }

      // ── Step 3: Batch-fetch department names ────────────────────────
      const deptIds = [...new Set(rows.map(r => r.department_id).filter(Boolean))] as string[];
      let deptMap: Record<string, string> = {};
      if (deptIds.length > 0) {
        const { data: depts } = await supabase
          .from("departments").select("id, name").in("id", deptIds);
        (depts || []).forEach((d: any) => { deptMap[d.id] = d.name; });
      }

      // ── Step 4: Batch-fetch course codes + names ────────────────────
      const courseIds = [...new Set(rows.map(r => r.course_id).filter(Boolean))] as string[];
      let courseMap: Record<string, { code: string; name: string }> = {};
      if (courseIds.length > 0) {
        const { data: courses } = await supabase
          .from("courses").select("id, code, name").in("id", courseIds);
        (courses || []).forEach((c: any) => { courseMap[c.id] = { code: c.code, name: c.name }; });
      }

      // ── Step 5: Merge ───────────────────────────────────────────────
      setUploads(rows.map(row => ({
        ...row,
        uploader_name:   nameMap[row.user_id] || "Unknown",
        department_name: (row.department_id && deptMap[row.department_id]) || "Unknown",
        course_code:     (row.course_id && courseMap[row.course_id]?.code) || "",
        course_name:     (row.course_id && courseMap[row.course_id]?.name) || "",
      })));
    } catch (err: any) {
      console.error("useCommunityUploads error:", err);
      setError(err.message || "Failed to load uploads");
    } finally {
      setLoading(false);
    }
  }, [scope, departmentId, statusFilter]);

  useEffect(() => { fetchUploads(); }, [fetchUploads]);

  const approveUpload = async (uploadId: string, note?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { error } = await supabase.rpc("approve_community_upload", {
      p_upload_id: uploadId, p_reviewer_id: user.id, p_note: note || null,
    });
    if (error) throw error;
    logActivity("upload_approved", { title: uploads.find(u => u.id === uploadId)?.title || uploadId });
    await fetchUploads();
  };

  const rejectUpload = async (uploadId: string, note?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { error } = await supabase.rpc("reject_community_upload", {
      p_upload_id: uploadId, p_reviewer_id: user.id, p_note: note || null,
    });
    if (error) throw error;
    logActivity("upload_rejected", { title: uploads.find(u => u.id === uploadId)?.title || uploadId });
    await fetchUploads();
  };

  const deleteUpload = async (uploadId: string) => {
    const { error } = await supabase.from("community_uploads").delete().eq("id", uploadId);
    if (error) throw error;
    await fetchUploads();
  };

  return { uploads, loading, error, refetch: fetchUploads, approveUpload, rejectUpload, deleteUpload };
}
