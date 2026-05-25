/**
 * useInstitution.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PLACE THIS FILE AT:  src/hooks/useInstitution.ts
 *
 * Thin React hook that wraps getInstitutionFromDomain so components and the
 * redirect component can consume it as a stable value.
 *
 * Reading hostname inside useState initialiser (not useEffect) is intentional:
 *   • It runs once synchronously — no flicker, no hydration mismatch.
 *   • hostname never changes during a page session, so no subscription needed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import {
  getInstitutionFromDomain,
  type InstitutionConfig,
} from "@/lib/institutionConfig";

export function useInstitution(): InstitutionConfig {
  // Initialiser runs once; hostname is stable for the lifetime of the page.
  const [institution] = useState<InstitutionConfig>(() =>
    getInstitutionFromDomain()
  );
  return institution;
}
