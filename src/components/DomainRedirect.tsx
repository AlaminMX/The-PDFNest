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

    // Only redirect when landing on the bare root path. Every other route
    // (dashboard, onboarding, reset-password-success, contribute, profile,
    // notifications, rep upload, etc.) must be left alone — those are real
    // in-app destinations that auth/onboarding/password-reset flows navigate
    // to, and blacklisting a handful of paths here previously broke all of
    // them on institution subdomains by bouncing users back to the landing
    // page mid-flow.
    if (location.pathname !== "/") return;

    // Safe to redirect.
    navigate(targetPath, { replace: true });
  }, [institution, location.pathname, navigate]);

  // This component renders nothing — it is purely a side-effect runner.
  return null;
}
