import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "./BottomNav";
import { RepBottomNav } from "./RepBottomNav";

const REP_STATUS_CACHE_KEY = "pdfnest_rep_status";

interface CachedRepStatus {
  isRep: boolean;
  userId: string;
  timestamp: number;
}

export function SmartBottomNav() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isRep, setIsRep] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to get cached status immediately
    const cached = sessionStorage.getItem(REP_STATUS_CACHE_KEY);
    if (cached) {
      try {
        const parsed: CachedRepStatus = JSON.parse(cached);
        // Cache valid for 5 minutes
        if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          setUserId(parsed.userId);
          setIsRep(parsed.isRep);
          setIsLoading(false);
        }
      } catch {
        sessionStorage.removeItem(REP_STATUS_CACHE_KEY);
      }
    }

    checkUserAndRepStatus();
  }, []);

  const checkUserAndRepStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUserId(null);
        setIsRep(false);
        setIsLoading(false);
        sessionStorage.removeItem(REP_STATUS_CACHE_KEY);
        return;
      }

      setUserId(user.id);

      // Check rep role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "rep")
        .maybeSingle();

      const repStatus = !!roleData;
      setIsRep(repStatus);
      setIsLoading(false);

      // Cache the result
      const cacheData: CachedRepStatus = {
        isRep: repStatus,
        userId: user.id,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(REP_STATUS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error("Error checking user status:", error);
      setIsLoading(false);
    }
  };

  // Don't render anything while loading to prevent flash
  if (isLoading) {
    return null;
  }

  // Rep users get RepBottomNav
  if (isRep && userId) {
    return <RepBottomNav repUserId={userId} />;
  }

  // Regular users and guests get BottomNav
  return <BottomNav isLoggedIn={!!userId} userId={userId || undefined} />;
}
