import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COURSE_CODE_RE = /^([A-Z]{2,4})\s?(\d{2,3})/i;
const MAX_QUERY_LENGTH = 100;
// Strip characters that could interfere with Postgres ILIKE patterns
const SANITIZE_RE = /[%_\\]/g;

function sanitize(input: string): string {
  return input.replace(SANITIZE_RE, "\\$&");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = await req.json().catch(() => ({ query: "" }));
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ courses: [], pqCourses: [], lectureNotes: [], pastQuestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmed = query.trim().slice(0, MAX_QUERY_LENGTH);
    const sanitized = sanitize(trimmed);

    // Parse intent
    const codeMatch = trimmed.match(COURSE_CODE_RE);
    let courseCodePattern: string | null = null;
    let keywordHint: string | null = null;

    if (codeMatch) {
      courseCodePattern = `${codeMatch[1]}${codeMatch[2]}`.toUpperCase();
      const rest = trimmed.slice(codeMatch[0].length).trim();
      if (rest.length >= 2) keywordHint = rest;
    }

    const wildcardQuery = `%${sanitized}%`;
    const codeWildcard = courseCodePattern ? `${sanitize(courseCodePattern)}%` : null;

    // Run all queries in parallel
    const [coursesRes, pqCoursesRes, notesRes, pqFilesRes, standaloneRes] = await Promise.all([
      // 1. Courses with department info
      supabase
        .from("courses")
        .select(`
          id, code, name, level, semester,
          departments!inner(id, name, slug, faculty_id, faculties(slug))
        `)
        .or(
          codeWildcard
            ? `code.ilike.${codeWildcard},name.ilike.${wildcardQuery}`
            : `code.ilike.${wildcardQuery},name.ilike.${wildcardQuery}`
        )
        .eq("status", "approved")
        .limit(15),

      // 2. PQ courses
      supabase
        .from("pq_courses")
        .select("id, code, name, level, semester")
        .or(
          codeWildcard
            ? `code.ilike.${codeWildcard},name.ilike.${wildcardQuery}`
            : `code.ilike.${wildcardQuery},name.ilike.${wildcardQuery}`
        )
        .limit(5),

      // 3. Lecture notes (only if we have a keyword or no course code)
      supabase
        .from("lecture_notes")
        .select(`
          id, title, file_path,
          courses!inner(code, level, semester, department_id,
            departments!inner(slug, faculty_id, faculties(slug))
          )
        `)
        .ilike("title", wildcardQuery)
        .limit(5),

      // 4. Past question files
      supabase
        .from("past_questions")
        .select(`
          id, title, file_path,
          pq_courses!inner(code, level, semester)
        `)
        .ilike("title", wildcardQuery)
        .limit(5),
    ]);

    // Transform courses
    const courses = (coursesRes.data || []).map((c: any) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      level: c.level,
      semester: c.semester,
      department_id: c.departments?.id,
      department_name: c.departments?.name,
      department_slug: c.departments?.slug,
      faculty_slug: c.departments?.faculties?.slug || null,
    }));

    // Sort: exact code matches first, then by keyword hint on department name
    courses.sort((a: any, b: any) => {
      const aExact = courseCodePattern && a.code.toUpperCase() === courseCodePattern ? 0 : 1;
      const bExact = courseCodePattern && b.code.toUpperCase() === courseCodePattern ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;

      if (keywordHint) {
        const hintLower = keywordHint.toLowerCase();
        const aMatch = a.department_name?.toLowerCase().includes(hintLower) ? 0 : 1;
        const bMatch = b.department_name?.toLowerCase().includes(hintLower) ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
      }
      return 0;
    });

    // Transform PQ courses
    const pqCourses = (pqCoursesRes.data || []).map((c: any) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      level: c.level,
      semester: c.semester,
    }));

    // Transform lecture notes
    const lectureNotes = (notesRes.data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      file_path: n.file_path,
      course_code: n.courses?.code,
      level: n.courses?.level,
      semester: n.courses?.semester,
      department_slug: n.courses?.departments?.slug,
      faculty_slug: n.courses?.departments?.faculties?.slug || null,
    }));

    // Transform past questions
    const pastQuestions = (pqFilesRes.data || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      file_path: p.file_path,
      course_code: p.pq_courses?.code,
      level: p.pq_courses?.level,
      semester: p.pq_courses?.semester,
    }));

    return new Response(
      JSON.stringify({ courses: courses.slice(0, 10), pqCourses, lectureNotes, pastQuestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("search-global error:", err);
    return new Response(
      JSON.stringify({ error: "Search failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
