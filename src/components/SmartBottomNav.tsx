import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "./BottomNav";
import { RepBottomNav } from "./RepBottomNav";

export function SmartBottomNav() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isRep, setIsRep] = useState<boolean | null>(null);
  const [hasDepartment, setHasDepartment] = useState<boolean>(true);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUserAndRepStatus();
  }, []);

  const checkUserAndRepStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
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

  // Keep layout stable: render a non-personalized nav while status loads.
  if (isLoading) {
    return <BottomNav isLoggedIn={false} showProfileDot={false} unreadNotifications={0} />;
  }

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
