import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/sessionLogger";

export function ActivityRouteTracker() {
  const { pathname } = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const previousVisit = useRef<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUserId(session?.user.id ?? null),
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      previousVisit.current = null;
      return;
    }
    const visit = `${userId}:${pathname}`;
    if (previousVisit.current === visit) return;

    previousVisit.current = visit;
    void logActivity("page_view", { path: pathname, source: "route_tracker" });
  }, [userId, pathname]);

  return null;
}
