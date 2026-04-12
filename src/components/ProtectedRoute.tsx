import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        sessionStorage.setItem("redirectAfterLogin", location.pathname + location.search);
        navigate("/auth", { replace: true });
      } else {
        setIsAuthenticated(true);
      }
      setChecking(false);
    });
  }, [location.pathname]);

  if (checking) return null;
  return isAuthenticated ? <>{children}</> : null;
}
