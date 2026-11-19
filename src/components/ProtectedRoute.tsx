import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";

export function ProtectedRoute({
  children,
  requireOnboarding = true,
}: {
  children: ReactNode;
  requireOnboarding?: boolean;
}) {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();
  const [userId, setUserId] = useState<string | null>();

  const onboarding = useQuery({
    queryKey: ["onboarding-complete", userId],
    queryFn: () => hasCompletedOnboarding(userId!),
    enabled: requireOnboarding && Boolean(userId),
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUserId(session?.user.id ?? null),
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const destination = pathname + search + hash;
    if (userId === null) {
      if (requireOnboarding) sessionStorage.setItem("redirectAfterLogin", destination);
      navigate("/auth?mode=signin", { replace: true });
    } else if (userId && requireOnboarding && onboarding.data === false && !onboarding.isFetching && !onboarding.isError) {
      sessionStorage.setItem("redirectAfterLogin", destination);
      navigate("/onboarding", { replace: true });
    }
  }, [userId, requireOnboarding, onboarding.data, onboarding.isFetching, onboarding.isError, pathname, search, hash, navigate]);

  if (!userId) return null;
  if (requireOnboarding) {
    if (onboarding.isError) {
      return (
        <div className="min-h-screen grid place-content-center gap-3 p-6 text-center">
          <p role="alert">Couldn’t check your account setup.</p>
          <Button onClick={() => void onboarding.refetch()}>Try again</Button>
        </div>
      );
    }
    if (onboarding.data !== true) return <LoadingState message="Checking account setup…" />;
  }
  return <Fragment key={userId}>{children}</Fragment>;
}
