import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "./BottomNav";
import { RepBottomNav } from "./RepBottomNav";

const USER_STATUS_CACHE_KEY = "pdfnest_user_status_cache";
const CACHE_TTL = 60_000;

interface CachedUserStatus {
  userId: string | null;
  isRep: boolean;
  hasDepartment: boolean;
  timestamp: number;
}

export function SmartBottomNav() {
  const cachedStatus = useMemo((): CachedUserStatus | null => {
    try {
      const cached = localStorage.getItem(USER_STATUS_CACHE_KEY);
      if (!cached) return null;
      const parsed = JSON.parse(cached) as CachedUserStatus;
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        return parsed;
      }
    } catch {
      // ignore parse errors
    }
    return null;
  }, []);

  const [userId, setUserId] = useState<string | null>(cachedStatus?.userId ?? null);
  const [isRep, setIsRep] = useState<boolean | null>(cachedStatus?.isRep ?? null);
  const [hasDepartment, setHasDepartment] = useState<boolean>(cachedStatus?.hasDepartment ?? true);

  useEffect(() => {
    const checkUserAndRepStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          const guestStatus: CachedUserStatus = {
            userId: null,
            isRep: false,
            hasDepartment: true,
            timestamp: Date.now(),
          };
          localStorage.setItem(USER_STATUS_CACHE_KEY, JSON.stringify(guestStatus));
          setUserId(null);
          setIsRep(false);
          setHasDepartment(true);
          return;
        }

        const [roleData, profileData] = await Promise.all([
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
        ]);

        const nextStatus: CachedUserStatus = {
          userId: user.id,
          isRep: Boolean(roleData.data),
          hasDepartment: Boolean(profileData.data?.department_id),
          timestamp: Date.now(),
        };

        localStorage.setItem(USER_STATUS_CACHE_KEY, JSON.stringify(nextStatus));
        setUserId(nextStatus.userId);
        setIsRep(nextStatus.isRep);
        setHasDepartment(nextStatus.hasDepartment);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error checking user status:", error);
        }
      }
    };

    checkUserAndRepStatus();
  }, []);

  if (isRep && userId) {
    return <RepBottomNav repUserId={userId} />;
  }

  return (
    <BottomNav
      isLoggedIn={Boolean(userId)}
      userId={userId || undefined}
      showProfileDot={Boolean(userId) && !hasDepartment}
    />
  );
}
