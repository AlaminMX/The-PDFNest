import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CourseResult {
  id: string;
  code: string;
  name: string;
  level: number;
  semester: string;
  department_id: string;
  department_name: string;
  department_slug: string;
  faculty_slug: string | null;
}

export interface PQCourseResult {
  id: string;
  code: string;
  name: string;
  level: number;
  semester: string;
}

export interface LectureNoteResult {
  id: string;
  title: string;
  file_path: string;
  course_code: string;
  level: number;
  semester: string;
  department_slug: string;
  faculty_slug: string | null;
}

export interface PastQuestionResult {
  id: string;
  title: string;
  file_path: string;
  course_code: string;
  level: number;
  semester: string;
}

export interface StandaloneDocumentResult {
  id: string;
  title: string;
  category: "book" | "journal";
  department_id: string;
  department_slug: string;
  department_name: string;
}

export interface SearchResults {
  courses: CourseResult[];
  pqCourses: PQCourseResult[];
  lectureNotes: LectureNoteResult[];
  pastQuestions: PastQuestionResult[];
  standaloneDocuments: StandaloneDocumentResult[];
}

const EMPTY: SearchResults = { courses: [], pqCourses: [], lectureNotes: [], pastQuestions: [], standaloneDocuments: [] };

export function useGlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const { data, error } = await supabase.functions.invoke("search-global", {
          body: { query: query.trim() },
        });

        if (controller.signal.aborted) return;
        if (error) throw error;
        setResults(data || EMPTY);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("Search error:", err);
        setResults(EMPTY);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [query]);

  return { query, setQuery, results, loading };
}
