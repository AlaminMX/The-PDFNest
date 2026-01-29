import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cache key for rep status
const REP_STATUS_CACHE_KEY = "pdfnest_rep_status_cache";
const CACHE_TTL = 60_000; // 60 seconds

interface RepStatus {
  isRep: boolean;
  departmentId: string | null;
  departmentName: string | null;
  displayName: string | null;
  isInsider: boolean;
  avatarUrl: string | null;
}

interface CachedRepStatus extends RepStatus {
  userId: string | null;
  timestamp: number;
}

const defaultStatus: RepStatus = {
  isRep: false,
  departmentId: null,
  departmentName: null,
  displayName: null,
  isInsider: false,
  avatarUrl: null,
};

export function useRepStatus() {
  // Get cached status immediately for instant render
  const cachedStatus = useMemo((): CachedRepStatus | null => {
    try {
      const cached = localStorage.getItem(REP_STATUS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as CachedRepStatus;
        // Only use cache if not expired
        if (Date.now() - parsed.timestamp < CACHE_TTL) {
          return parsed;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  }, []);

  const [status, setStatus] = useState<RepStatus>(
    cachedStatus ? {
      isRep: cachedStatus.isRep,
      departmentId: cachedStatus.departmentId,
      departmentName: cachedStatus.departmentName,
      displayName: cachedStatus.displayName,
      isInsider: cachedStatus.isInsider,
      avatarUrl: cachedStatus.avatarUrl,
    } : defaultStatus
  );
  const [loading, setLoading] = useState(!cachedStatus);

  useEffect(() => {
    checkRepStatus();
  }, []);

  const checkRepStatus = async () => {
    try {
      // Don't show loading if we have cached data
      if (!cachedStatus) {
        setLoading(true);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const newStatus: CachedRepStatus = {
          ...defaultStatus,
          userId: null,
          timestamp: Date.now(),
        };
        localStorage.setItem(REP_STATUS_CACHE_KEY, JSON.stringify(newStatus));
        setStatus(defaultStatus);
        setLoading(false);
        return;
      }

      // Parallel fetch: user_roles and profile with department join
      const [roleResult, profileResult] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "rep")
          .maybeSingle(),
        supabase
          .from("profiles")
          .select(`
            department_id,
            display_name,
            is_insider,
            avatar_url,
            departments (
              name
            )
          `)
          .eq("id", user.id)
          .single(),
      ]);

      const isRep = !!roleResult.data;
      const profile = profileResult.data;

      const newStatus: RepStatus = {
        isRep,
        departmentId: profile?.department_id || null,
        departmentName: (profile?.departments as any)?.name || null,
        displayName: profile?.display_name || null,
        isInsider: profile?.is_insider || false,
        avatarUrl: profile?.avatar_url || null,
      };

      // Cache the status
      const cachedData: CachedRepStatus = {
        ...newStatus,
        userId: user.id,
        timestamp: Date.now(),
      };
      localStorage.setItem(REP_STATUS_CACHE_KEY, JSON.stringify(cachedData));

      setStatus(newStatus);
      setLoading(false);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Error checking rep status:", err);
      }
      setLoading(false);
    }
  };

  return { ...status, loading, refresh: checkRepStatus };
}
