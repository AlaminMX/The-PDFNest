import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "./BottomNav";
import { RepBottomNav } from "./RepBottomNav";

const REP_STATUS_CACHE_KEY = "pdfnest_rep_status";
const DEPT_STATUS_CACHE_KEY = "pdfnest_dept_status";

interface CachedRepStatus {
  isRep: boolean;
  userId: string;
  timestamp: number;
}

interface CachedDeptStatus {
  hasDepartment: boolean;
  userId: string;
  timestamp: number;
}

export function SmartBottomNav() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isRep, setIsRep] = useState<boolean | null>(null);
  const [hasDepartment, setHasDepartment] = useState<boolean>(true);
  const [hasBannerDot, setHasBannerDot] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to get cached status immediately from localStorage (persistent)
    const cached = localStorage.getItem(REP_STATUS_CACHE_KEY);
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
        localStorage.removeItem(REP_STATUS_CACHE_KEY);
      }
    }

    // Check department cache
    const deptCached = localStorage.getItem(DEPT_STATUS_CACHE_KEY);
    if (deptCached) {
      try {
        const parsed: CachedDeptStatus = JSON.parse(deptCached);
        if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          setHasDepartment(parsed.hasDepartment);
        }
      } catch {
        localStorage.removeItem(DEPT_STATUS_CACHE_KEY);
      }
    }

    checkUserAndRepStatus();
    checkBannerDot();
  }, []);

  const checkBannerDot = async () => {
    try {
      // Check for active banners with show_profile_dot
      const { data: banners } = await supabase
        .from("admin_banners")
        .select("id")
        .eq("is_active", true)
        .eq("show_profile_dot", true)
        .limit(1);

      setHasBannerDot(banners && banners.length > 0);
    } catch (error) {
      console.error("Error checking banner dot:", error);
    }
  };

  const checkUserAndRepStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUserId(null);
        setIsRep(false);
        setHasDepartment(true);
        setIsLoading(false);
        localStorage.removeItem(REP_STATUS_CACHE_KEY);
        localStorage.removeItem(DEPT_STATUS_CACHE_KEY);
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

      // Check department
      const { data: profileData } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", user.id)
        .maybeSingle();

      const deptStatus = !!profileData?.department_id;
      setHasDepartment(deptStatus);

      setIsLoading(false);

      // Cache the results in localStorage for persistence
      const repCacheData: CachedRepStatus = {
        isRep: repStatus,
        userId: user.id,
        timestamp: Date.now(),
      };
      localStorage.setItem(REP_STATUS_CACHE_KEY, JSON.stringify(repCacheData));

      const deptCacheData: CachedDeptStatus = {
        hasDepartment: deptStatus,
        userId: user.id,
        timestamp: Date.now(),
      };
      localStorage.setItem(DEPT_STATUS_CACHE_KEY, JSON.stringify(deptCacheData));
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
  // Show notification dot if user is logged in but has no department, or if there's an active banner with dot
  const showDot = (!!userId && !hasDepartment) || hasBannerDot;
  return <BottomNav isLoggedIn={!!userId} userId={userId || undefined} showProfileDot={showDot} />;
}
