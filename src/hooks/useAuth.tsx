import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { startSession, endSession, setupIdleDetection, logActivity } from "@/lib/sessionLogger";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cleanupIdleDetection: (() => void) | null = null;

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Start session on login
      if (event === 'SIGNED_IN' && session) {
        setTimeout(() => {
          startSession();
          cleanupIdleDetection = setupIdleDetection();
        }, 0);
      }
      
      if (!session) {
        navigate("/auth");
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate("/auth");
      } else {
        // Set up idle detection for existing sessions
        cleanupIdleDetection = setupIdleDetection();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (cleanupIdleDetection) {
        cleanupIdleDetection();
      }
    };
  }, [navigate]);

  const signOut = async () => {
    await logActivity("logout", { source: "manual_sign_out" });
    await endSession();
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return { user, session, loading, signOut };
}
