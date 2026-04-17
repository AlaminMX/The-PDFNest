/**
 * Level label helpers for the Course Rep context.
 *
 * Per product spec: in rep-facing UI we display "100 Level" as "U25".
 * Other levels keep their normal label (e.g. "200 Level").
 *
 * Use `getRepLevelLabel` only inside rep pages / rep modals so the
 * standard label is preserved everywhere else in the app.
 */
export function getRepLevelLabel(level: number): string {
  if (level === 100) return "U25";
  return `${level} Level`;
}

export function getRepLevelShortLabel(level: number): string {
  if (level === 100) return "U25";
  return `${level}L`;
}
