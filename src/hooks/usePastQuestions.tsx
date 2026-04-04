import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PastQuestion {
  id: string;
  pq_course_id: string;
  uploaded_by: string;
  uploaded_by_display: string;
  file_path: string;
  title: string;
  file_size: number;
  material_type: string;
  level: number | null;
  views: number;
  created_at: string | null;
}

export function usePastQuestions(pqCourseId?: string) {
  const [questions, setQuestions] = useState<PastQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pqCourseId) { setQuestions([]); setLoading(false); return; }

    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("past_questions" as any)
          .select("*")
          .eq("pq_course_id", pqCourseId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setQuestions((data || []) as unknown as PastQuestion[]);
      } catch (err) {
        console.error("usePastQuestions error:", err);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [pqCourseId]);

  const incrementViews = async (questionId: string) => {
    try {
      const { data } = await supabase
        .from("past_questions" as any)
        .select("views")
        .eq("id", questionId)
        .single();
      if (data) {
        await supabase
          .from("past_questions" as any)
          .update({ views: ((data as any).views || 0) + 1 })
          .eq("id", questionId);
      }
    } catch {}
  };

  const getSignedUrl = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("school_pdfs")
        .createSignedUrl(filePath, 3600);
      if (error) throw error;
      return data.signedUrl;
    } catch { return null; }
  };

  return { questions, loading, incrementViews, getSignedUrl, refresh: () => {} };
}
