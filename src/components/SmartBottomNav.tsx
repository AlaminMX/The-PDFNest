import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "./BottomNav";
import { RepBottomNav } from "./RepBottomNav";

// Cache key for user status
const USER_STATUS_CACHE_KEY = "pdfnest_user_status_cache";
const CACHE_TTL = 30_000; // 30 seconds

interface CachedUserStatus {
  userId: string | null;
  isRep: boolean;
  hasDepartment: boolean;
  unreadNotifications: number;
  timestamp: number;
}

export function SmartBottomNav() {
  // Get cached status immediately for instant render
  const cachedStatus = useMemo((): CachedUserStatus | null => {
    try {
      const cached = localStorage.getItem(USER_STATUS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as CachedUserStatus;
        // Only use cache if not expired
        if (Date.now() - parsed.timestamp < CACHE_TTL) {
          return parsed;
        }
      }
    } catch {}
    return null;
  }, []);

  const [userId, setUserId] = useState<string | null>(cachedStatus?.userId ?? null);
  const [isRep, setIsRep] = useState<boolean | null>(cachedStatus?.isRep ?? null);
  const [hasDepartment, setHasDepartment] = useState<boolean>(cachedStatus?.hasDepartment ?? true);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(cachedStatus?.unreadNotifications ?? 0);
  const [isLoading, setIsLoading] = useState(!cachedStatus);

  useEffect(() => {
    checkUserAndRepStatus();
  }, []);

  const checkUserAndRepStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        const newStatus: CachedUserStatus = {
          userId: null,
          isRep: false,
          hasDepartment: true,
          unreadNotifications: 0,
          timestamp: Date.now(),
        };
        localStorage.setItem(USER_STATUS_CACHE_KEY, JSON.stringify(newStatus));
        setUserId(null);
        setIsRep(false);
        setHasDepartment(true);
        setUnreadNotifications(0);
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      // Batch all queries in parallel for faster load
      const [roleData, profileData, notifData] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "rep")
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("department_id")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("user_notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false),
      ]);

      const repStatus = !!(roleData.data);
      const deptStatus = !!(profileData.data?.department_id);
      const unreadCount = notifData.count || 0;

      // Cache the status
      const newStatus: CachedUserStatus = {
        userId: user.id,
        isRep: repStatus,
        hasDepartment: deptStatus,
        unreadNotifications: unreadCount,
        timestamp: Date.now(),
      };
      localStorage.setItem(USER_STATUS_CACHE_KEY, JSON.stringify(newStatus));

      setIsRep(repStatus);
      setHasDepartment(deptStatus);
      setUnreadNotifications(unreadCount);
      setIsLoading(false);
    } catch (error) {
      console.error("Error checking user status:", error);
      setIsLoading(false);
    }
  };

  // Subscribe to notification updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`nav_notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          const { count } = await supabase
            .from("user_notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("is_read", false);
          setUnreadNotifications(count || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Render immediately with cached data or stable default
  // Rep users get RepBottomNav
  if (isRep && userId) {
    return <RepBottomNav repUserId={userId} unreadNotifications={unreadNotifications} />;
  }

  // Regular users and guests get BottomNav
  // Show notification dot only if user is logged in but has no department
  const showDot = !!userId && !hasDepartment;
  return (
    <BottomNav 
      isLoggedIn={!!userId} 
      userId={userId || undefined} 
      showProfileDot={showDot} 
      unreadNotifications={unreadNotifications}
    />
  );
}
