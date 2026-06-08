/**
 * Build a browse URL for the AFIT PDFs hierarchy.
 *
 * Departments with a faculty live under /afit-pdfs/:facultySlug/:deptSlug/...
 * Standalone departments (no faculty) live under /afit-pdfs/dept/:deptSlug/...
 */
export function buildBrowsePath(
  deptSlug: string,
  facultySlug?: string | null,
  ...segments: (string | number)[]
): string {
  const base = facultySlug
    ? `/afit-pdfs/${facultySlug}/${deptSlug}`
    : `/afit-pdfs/dept/${deptSlug}`;
  return segments.length ? `${base}/${segments.join("/")}` : base;
}
