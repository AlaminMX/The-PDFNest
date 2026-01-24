import { useState, useEffect, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Store the intended destination
        sessionStorage.setItem('redirectAfterLogin', location.pathname + location.search);
        toast.info("Please sign in to access this content");
        navigate("/auth");
      } else {
        setIsAuthenticated(true);
      }
      setChecking(false);
    };

    checkAuth();
  }, [navigate, location]);

  // Avoid rendering a full-screen intermediary UI which can cause perceived flicker.
  // If unauthenticated, we redirect immediately; if authenticated, children render.
  if (checking) return null;

  return isAuthenticated ? <>{children}</> : null;
}
