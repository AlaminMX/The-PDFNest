
DROP VIEW IF EXISTS public.pq_courses_with_counts;
CREATE VIEW public.pq_courses_with_counts WITH (security_invoker = on) AS
SELECT
  c.*,
  COALESCE(pq.cnt, 0) AS question_count
FROM public.pq_courses c
LEFT JOIN (
  SELECT pq_course_id, COUNT(*) AS cnt FROM public.past_questions GROUP BY pq_course_id
) pq ON pq.pq_course_id = c.id;
