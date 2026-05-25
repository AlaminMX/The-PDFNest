/**
 * DomainRedirect.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * PLACE THIS FILE AT:  src/components/DomainRedirect.tsx
 *
 * Renders nothing — its only job is to redirect once on mount when the
 * detected institution has a custom landingPath AND the user is not already
 * on that path (or a sub-path beneath it).
 *
 * ✔  No redirect loop — checks pathname before navigating.
 * ✔  No hydration mismatch — runs client-side only (inside BrowserRouter).
 * ✔  Does not break any existing route — default institution does nothing.
 * ✔  Scalable — driven entirely by INSTITUTION_MAP in institutionConfig.ts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useInstitution } from "@/hooks/useInstitution";

export function DomainRedirect() {
  const institution = useInstitution();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Default institution — nothing to do.
    if (institution.key === "default") return;

    const targetPath = institution.landingPath;

    // Already on the target path (or a child route beneath it) — do NOT
    // redirect; that would create an infinite loop.
    if (location.pathname.startsWith(targetPath)) return;

    // Also leave admin and auth routes alone regardless of domain.
    const bypassPrefixes = ["/admin", "/auth", "/reset-password"];
    if (bypassPrefixes.some((p) => location.pathname.startsWith(p))) return;

    // Safe to redirect.
    navigate(targetPath, { replace: true });
  }, [institution, location.pathname, navigate]);

  // This component renders nothing — it is purely a side-effect runner.
  return null;
}
