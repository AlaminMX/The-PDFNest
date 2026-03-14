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
