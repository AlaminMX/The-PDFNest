import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthGate } from "@/components/AuthGate";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonthlyLeaderboard, MonthlyLeaderboardEntry } from "@/hooks/useContributorStats";
import { useDepartments } from "@/hooks/useDepartments";
import { useUserDepartment } from "@/hooks/useUserDepartment";
import { useAuth } from "@/hooks/useAuth";
import { BADGE_CONFIG } from "@/components/ContributorBadges";
import { Trophy, Medal, Calendar, Upload } from "lucide-react";
import { format } from "date-fns";

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

function BadgeChips({ badges }: { badges: { badge_type: string }[] }) {
  if (!badges || badges.length === 0) return null;
  return (
    <div className="flex gap-0.5 flex-wrap">
      {badges.slice(0, 3).map((b) => {
        const config = BADGE_CONFIG[b.badge_type];
        if (!config) return null;
        return (
          <span key={b.badge_type} className="text-xs" title={config.label}>
            {config.emoji}
          </span>
        );
      })}
    </div>
  );
}

function LeaderboardRow({
  entry,
  index,
  isCurrentUser,
}: {
  entry: MonthlyLeaderboardEntry;
  index: number;
  isCurrentUser: boolean;
}) {
  const rank = index + 1;
  const isTop3 = rank <= 3;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        isCurrentUser
          ? "bg-primary/10 border-l-2 border-primary"
          : isTop3
          ? "bg-primary/5 border border-primary/10"
          : "hover:bg-muted/50"
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
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">
            {entry.display_name || "Anonymous"}
            {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(You)</span>}
          </p>
          <BadgeChips badges={entry.badges} />
        </div>
        {entry.department_name && (
          <p className="text-xs text-muted-foreground truncate">{entry.department_name}</p>
        )}
      </div>

      <div className="text-right shrink-0">
        <div className="flex items-center gap-1 justify-end">
          <Upload className="w-3 h-3 text-primary" />
          <span className="text-sm font-bold">{entry.monthly_uploads}</span>
        </div>
        <p className="text-xs text-muted-foreground">approved</p>
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

type Tab = "my-dept" | "all";

function LeaderboardContent() {
  const { user } = useAuth();
  const { departmentId: userDeptId, departmentName: userDeptName } = useUserDepartment(user?.id);
  const { departments } = useDepartments();
  const [tab, setTab] = useState<Tab>("my-dept");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("auto");

  // Resolve the actual department filter
  const activeDeptId =
    tab === "my-dept"
      ? userDeptId || null
      : selectedDeptId === "all"
      ? null
      : selectedDeptId === "auto"
      ? null
      : selectedDeptId;

  const { entries, loading } = useMonthlyLeaderboard(activeDeptId);

  // Set initial selected dept when switching to "all" tab
  useEffect(() => {
    if (tab === "all" && selectedDeptId === "auto") {
      setSelectedDeptId("all");
    }
  }, [tab, selectedDeptId]);

  const currentMonthLabel = format(new Date(), "MMMM yyyy");

  const activeDeptName =
    tab === "my-dept"
      ? userDeptName || "Your Department"
      : selectedDeptId === "all"
      ? "All Departments"
      : departments.find((d) => d.id === selectedDeptId)?.name || "All Departments";

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Leaderboard" showBack backTo="/dashboard" />

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Banner */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/20">
          <div className="p-2 rounded-full bg-amber-500/20">
            <Medal className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Monthly Leaderboard</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{currentMonthLabel}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="w-full">
            <TabsTrigger value="my-dept" className="flex-1">My Department</TabsTrigger>
            <TabsTrigger value="all" className="flex-1">All Departments</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Department switcher for "All" tab */}
        {tab === "all" && (
          <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
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

        {/* Department label for "My Department" tab */}
        {tab === "my-dept" && userDeptName && (
          <p className="text-xs text-muted-foreground text-center">{userDeptName}</p>
        )}

        {/* Missing department notice */}
        {tab === "my-dept" && !userDeptId && (
          <Card>
            <CardContent className="py-8 text-center space-y-2 text-muted-foreground">
              <Trophy className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-sm">Set your department on your profile to see your department leaderboard.</p>
            </CardContent>
          </Card>
        )}

        {/* List */}
        {(tab !== "my-dept" || userDeptId) && (
          <Card>
            <CardContent className="pt-4 pb-2">
              {loading ? (
                <LeaderboardSkeleton />
              ) : entries.length === 0 ? (
                <div className="text-center py-12 space-y-2 text-muted-foreground">
                  <Trophy className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-sm">No contributors this month</p>
                  <p className="text-xs">Be the first to contribute a material!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {entries.map((entry, i) => (
                    <LeaderboardRow
                      key={entry.user_id}
                      entry={entry}
                      index={i}
                      isCurrentUser={entry.user_id === user?.id}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground pb-2">
          Rankings based on approved uploads this month · Only approved materials count
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
