import { useState, useEffect } from "react";
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
  course_code: string;
  level: number;
  semester: string;
  department_slug: string;
  faculty_slug: string | null;
}

export interface PastQuestionResult {
  id: string;
  title: string;
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
  const [error, setError] = useState(false);

  useEffect(() => {
    const term = query.trim();
    setResults(EMPTY);
    setError(false);
    setLoading(term.length >= 2);
    if (term.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke<SearchResults>("search-global", {
          body: { query: term },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (error) throw error;
        setResults(data || EMPTY);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Search error:", error);
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { query, setQuery, results, loading, error };
}
