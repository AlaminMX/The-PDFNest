import { useState, useEffect, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { startSession, endSession, setupIdleDetection, logActivity } from "@/lib/sessionLogger";
import { isRecoveryRedirectInProgress } from "@/lib/authRecovery";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const sessionChecked = useRef(false);

  useEffect(() => {
    let cleanupIdleDetection: (() => void) | null = null;

    // Set up auth state listener FIRST before getSession
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === "SIGNED_IN" && newSession) {
        // Don't treat a recovery session like a normal app sign-in.
        if (isRecoveryRedirectInProgress()) return;

        // Defer side-effects so they don't block the render cycle
        setTimeout(() => {
          startSession().catch(() => {});
          cleanupIdleDetection = setupIdleDetection();
        }, 0);
      }

      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      // Only update if onAuthStateChange hasn't already resolved this
      if (!sessionChecked.current) {
        sessionChecked.current = true;
        setSession(existingSession);
        setUser(existingSession?.user ?? null);

        if (existingSession) {
          cleanupIdleDetection = setupIdleDetection();
        }
      }
      // Always clear loading once we have a definitive answer
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (cleanupIdleDetection) {
        cleanupIdleDetection();
      }
    };
  }, []); // Empty deps - navigate intentionally excluded to prevent re-subscribing

  const signOut = async () => {
    await logActivity("logout", { source: "manual_sign_out" }).catch(() => {});
    await endSession().catch(() => {});
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return { user, session, loading, signOut };
}
