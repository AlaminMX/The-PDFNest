import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthGate } from "@/components/AuthGate";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeaderboard, LeaderboardEntry } from "@/hooks/useContributorStats";
import { useDepartments } from "@/hooks/useDepartments";
import { Trophy, Medal } from "lucide-react";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return <span className="text-sm font-bold text-muted-foreground w-7 text-center">#{rank}</span>;
}

function LeaderboardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const rank = index + 1;
  const isTop3 = rank <= 3;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        isTop3 ? "bg-primary/5 border border-primary/10" : "hover:bg-muted/50"
      }`}
    >
      <div className="w-8 flex justify-center shrink-0">
        <RankIcon rank={rank} />
      </div>

      <Avatar className="w-9 h-9 shrink-0">
        <AvatarImage src={entry.avatar_url || undefined} />
        <AvatarFallback className="text-xs">{getInitials(entry.display_name)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{entry.display_name || "Anonymous"}</p>
        {entry.department_name && (
          <p className="text-xs text-muted-foreground truncate">{entry.department_name}</p>
        )}
      </div>

      <div className="text-right shrink-0">
        <div className="flex items-center gap-1 justify-end">
          <Trophy className="w-3 h-3 text-amber-500" />
          <span className="text-sm font-bold">{entry.total_points}</span>
        </div>
        <p className="text-xs text-muted-foreground">{entry.approved_count} uploads</p>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="w-8 h-5" />
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

type Tab = "all" | "department";

function LeaderboardContent() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const { departments } = useDepartments();

  const { entries, loading } = useLeaderboard(
    tab === "department" && deptFilter !== "all" ? deptFilter : null
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Leaderboard" showBack backTo="/dashboard" />

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Top banner */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/20">
          <div className="p-2 rounded-full bg-amber-500/20">
            <Medal className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold">Top Contributors</p>
            <p className="text-xs text-muted-foreground">
              Upload study materials to earn points and climb the ranks
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">All Time</TabsTrigger>
            <TabsTrigger value="department" className="flex-1">By Department</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Department filter (only visible on department tab) */}
        {tab === "department" && (
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* List */}
        <Card>
          <CardContent className="pt-4 pb-2">
            {loading ? (
              <LeaderboardSkeleton />
            ) : entries.length === 0 ? (
              <div className="text-center py-12 space-y-2 text-muted-foreground">
                <Trophy className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-sm">No contributors yet</p>
                <p className="text-xs">Be the first to contribute a material!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {entries.map((entry, i) => (
                  <LeaderboardRow key={entry.user_id} entry={entry} index={i} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-2">
          Points are awarded when your uploaded material is approved · 10 pts per approval
        </p>
      </div>

      <SmartBottomNav />
    </div>
  );
}

export default function Leaderboard() {
  return (
    <AuthGate>
      <LeaderboardContent />
    </AuthGate>
  );
}
