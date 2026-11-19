import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();
  const [userId, setUserId] = useState<string | null>();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUserId(session?.user.id ?? null),
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId === null) {
      sessionStorage.setItem("redirectAfterLogin", pathname + search + hash);
      navigate("/auth?mode=signin", { replace: true });
    }
  }, [userId, pathname, search, hash, navigate]);

  return userId ? <Fragment key={userId}>{children}</Fragment> : null;
}
