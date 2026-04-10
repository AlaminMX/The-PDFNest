import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Global interceptor: if the URL contains recovery hash params
 * (type=recovery or access_token in hash) and we're NOT already
 * on /reset-password, force-navigate there immediately.
 * This prevents the user from landing on /auth or /dashboard
 * when clicking the password-reset email link.
 */
export function RecoveryRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);

    const isRecoveryHash =
      hash.includes("type=recovery") || hash.includes("type=signup");
    const hasCode = params.has("code");
    const hasRecoveryType = params.get("type") === "recovery";

    // Only intercept recovery flows, not signup confirmations
    const isRecovery =
      hash.includes("type=recovery") || hasRecoveryType;

    if (isRecovery && location.pathname !== "/reset-password") {
      // Carry the hash/query to the reset page so Supabase client can parse it
      navigate(`/reset-password${window.location.search}${window.location.hash}`, {
        replace: true,
      });
    }
  }, [location.pathname, navigate]);

  return null;
}
