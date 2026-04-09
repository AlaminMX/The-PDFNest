import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ContributorStats {
  total_points: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
}

export interface ContributorBadge {
  badge_type: string;
  earned_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  approved_count: number;
  department_name: string | null;
  department_id: string | null;
  overall_rank: number;
}

export function useContributorStats(userId?: string | null) {
  const [stats, setStats] = useState<ContributorStats | null>(null);
  const [badges, setBadges] = useState<ContributorBadge[]>([]);
  const [departmentRank, setDepartmentRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const targetId = userId;
    if (!targetId) { setLoading(false); return; }

    setLoading(true);
    try {
      const [pointsResult, badgesResult] = await Promise.all([
        supabase
          .from("contributor_points")
          .select("total_points, approved_count, rejected_count, pending_count")
          .eq("user_id", targetId)
          .maybeSingle(),
        supabase
          .from("contributor_badges")
          .select("badge_type, earned_at")
          .eq("user_id", targetId)
          .order("earned_at", { ascending: true }),
      ]);

      if (pointsResult.data) {
        setStats(pointsResult.data as ContributorStats);

        // Fetch department rank via leaderboard view
        const { data: profileData } = await supabase
          .from("profiles")
          .select("department_id")
          .eq("id", targetId)
          .maybeSingle();

        if (profileData?.department_id) {
          const { data: leaderboard } = await supabase
            .from("contributor_leaderboard")
            .select("user_id, total_points")
            .eq("department_id", profileData.department_id)
            .order("total_points", { ascending: false });

          if (leaderboard) {
            const rank = leaderboard.findIndex((e: any) => e.user_id === targetId);
            setDepartmentRank(rank >= 0 ? rank + 1 : null);
          }
        }
      } else {
        setStats(null);
      }

      setBadges((badgesResult.data as ContributorBadge[]) || []);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error fetching contributor stats:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, badges, departmentRank, loading, refetch: fetchStats };
}

export function useLeaderboard(departmentId?: string | null, period?: "week" | "all") {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("contributor_leaderboard")
        .select("*")
        .order("total_points", { ascending: false })
        .limit(50);

      if (departmentId) {
        query = query.eq("department_id", departmentId);
      }

      const { data } = await query;
      setEntries((data as LeaderboardEntry[]) || []);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, [departmentId, period]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { entries, loading, refetch: fetchLeaderboard };
}

export interface MonthlyLeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  department_id: string | null;
  department_name: string | null;
  monthly_uploads: number;
  badges: ContributorBadge[];
}

export function useMonthlyLeaderboard(departmentId?: string | null) {
  const [entries, setEntries] = useState<MonthlyLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonthly = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      let query = supabase
        .from("community_uploads")
        .select("user_id, reviewed_at, department_id")
        .eq("status", "approved")
        .gte("reviewed_at", firstOfMonth);

      if (departmentId) {
        query = query.eq("department_id", departmentId);
      }

      const { data: uploads } = await query;
      if (!uploads || uploads.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Group by user_id
      const countMap: Record<string, { count: number; department_id: string | null }> = {};
      for (const u of uploads) {
        if (!countMap[u.user_id]) {
          countMap[u.user_id] = { count: 0, department_id: u.department_id };
        }
        countMap[u.user_id].count++;
      }

      const userIds = Object.keys(countMap);

      // Fetch profiles and badges in parallel
      const [profilesResult, badgesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, avatar_url, department_id, departments(name)")
          .in("id", userIds),
        supabase
          .from("contributor_badges")
          .select("user_id, badge_type, earned_at")
          .in("user_id", userIds),
      ]);

      const profileMap: Record<string, any> = {};
      for (const p of profilesResult.data || []) {
        profileMap[p.id] = p;
      }

      const badgeMap: Record<string, ContributorBadge[]> = {};
      for (const b of badgesResult.data || []) {
        if (!badgeMap[b.user_id]) badgeMap[b.user_id] = [];
        badgeMap[b.user_id].push({ badge_type: b.badge_type, earned_at: b.earned_at || "" });
      }

      const result: MonthlyLeaderboardEntry[] = userIds
        .map((uid) => {
          const profile = profileMap[uid];
          const dept = profile?.departments as any;
          return {
            user_id: uid,
            display_name: profile?.display_name || null,
            avatar_url: profile?.avatar_url || null,
            department_id: profile?.department_id || countMap[uid].department_id,
            department_name: dept?.name || null,
            monthly_uploads: countMap[uid].count,
            badges: badgeMap[uid] || [],
          };
        })
        .sort((a, b) => b.monthly_uploads - a.monthly_uploads)
        .slice(0, 50);

      setEntries(result);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error fetching monthly leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchMonthly();
  }, [fetchMonthly]);

  return { entries, loading, refetch: fetchMonthly };
}
