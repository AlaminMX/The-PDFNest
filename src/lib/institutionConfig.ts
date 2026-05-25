/**
 * institutionConfig.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PLACE THIS FILE AT:  src/lib/institutionConfig.ts
 *
 * Central registry of every institution subdomain.
 * To add a new institution, add ONE entry to INSTITUTION_MAP — nothing else
 * needs to change.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type InstitutionKey = "afit" | "kadpoly" | "unilag" | "default";

export interface InstitutionConfig {
  /** Short slug used in route paths, e.g. /afit-pdfs */
  key: InstitutionKey;
  /** Human-readable display name */
  label: string;
  /** The route the user is redirected to when this subdomain is detected */
  landingPath: string;
  /** The sidebar nav label that should be highlighted */
  sidebarLabel: string;
  /** Optional: accent colour override (Tailwind class or CSS variable) */
  accentColor?: string;
}

/**
 * ── ADD NEW INSTITUTIONS HERE ─────────────────────────────────────────────
 * key   = window.location.hostname value (full subdomain)
 * value = InstitutionConfig describing that institution's behaviour
 */
export const INSTITUTION_MAP: Record<string, InstitutionConfig> = {
  "afit.pdfnest.com.ng": {
    key: "afit",
    label: "AFIT",
    landingPath: "/afit-pdfs",
    sidebarLabel: "AFIT PDFs",
  },
  // Uncomment and fill in when you onboard these institutions:
  // "kadpoly.pdfnest.com.ng": {
  //   key: "kadpoly",
  //   label: "Kadpoly",
  //   landingPath: "/kadpoly-pdfs",
  //   sidebarLabel: "Kadpoly PDFs",
  // },
  // "unilag.pdfnest.com.ng": {
  //   key: "unilag",
  //   label: "UniLag",
  //   landingPath: "/unilag-pdfs",
  //   sidebarLabel: "UniLag PDFs",
  // },
};

/** Fallback used for pdfnest.com.ng and localhost */
export const DEFAULT_INSTITUTION: InstitutionConfig = {
  key: "default",
  label: "PDFNest",
  landingPath: "/dashboard",
  sidebarLabel: "",
};

/**
 * getInstitutionFromDomain
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure utility — safe to call during SSR (pass `hostname` explicitly) or in
 * the browser (omit the argument; falls back to `window.location.hostname`).
 *
 * Returns the matching InstitutionConfig, or DEFAULT_INSTITUTION when no
 * entry exists for the given hostname.
 *
 * @example
 *   getInstitutionFromDomain("afit.pdfnest.com.ng")  // → { key: "afit", ... }
 *   getInstitutionFromDomain("pdfnest.com.ng")        // → { key: "default", ... }
 *   getInstitutionFromDomain()                        // → reads window.location.hostname
 */
export function getInstitutionFromDomain(
  hostname?: string
): InstitutionConfig {
  const host =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "");

  return INSTITUTION_MAP[host] ?? DEFAULT_INSTITUTION;
}
