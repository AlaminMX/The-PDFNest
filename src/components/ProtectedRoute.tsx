import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Wraps any route that requires authentication.
 * If the user is not logged in, saves the current URL and redirects to /auth.
 * After sign-in/sign-up, Auth.tsx reads sessionStorage and returns them here.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Save where they were trying to go
        sessionStorage.setItem("redirectAfterLogin", location.pathname + location.search);
        navigate("/auth", { replace: true });
      }
    });
  }, [location.pathname]);

  return <>{children}</>;
}
