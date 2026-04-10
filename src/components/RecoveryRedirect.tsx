import { useLayoutEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getRecoveryRedirectPath } from "@/lib/authRecovery";

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

  useLayoutEffect(() => {
    const redirectPath = getRecoveryRedirectPath({
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    });

    if (redirectPath) {
      navigate(redirectPath, { replace: true });
    }
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
}
