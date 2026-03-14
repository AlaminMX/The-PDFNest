import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ContributorBadges } from "@/components/ContributorBadges";
import { useContributorStats } from "@/hooks/useContributorStats";
import { Upload, Trophy, CheckCircle, Clock } from "lucide-react";

interface ContributorStatsProps {
  userId: string;
}

export function ContributorStats({ userId }: ContributorStatsProps) {
  const navigate = useNavigate();
  const { stats, badges, departmentRank, loading } = useContributorStats(userId);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Upload className="w-4 h-4" />Contributions</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">You haven't contributed yet</p>
            <p className="text-xs text-muted-foreground mt-1">Upload study materials to earn points and badges</p>
          </div>
          <Button size="sm" onClick={() => navigate("/contribute")}>Start Contributing</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Upload className="w-4 h-4" />Contributions</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => navigate("/leaderboard")}>
            <Trophy className="w-3 h-3 mr-1" />Leaderboard
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <Trophy className="w-4 h-4 text-amber-500" />, value: stats.total_points, label: "Points", bg: "bg-amber-500/10" },
            { icon: <CheckCircle className="w-4 h-4 text-green-500" />, value: stats.approved_count, label: "Approved", bg: "bg-green-500/10" },
            { icon: <Clock className="w-4 h-4 text-blue-500" />, value: stats.pending_count, label: "Pending", bg: "bg-blue-500/10" },
            { icon: <Trophy className="w-4 h-4 text-primary" />, value: departmentRank ? `#${departmentRank}` : "—", label: "Dept. Rank", bg: "bg-primary/10" },
          ].map(({ icon, value, label, bg }) => (
            <div key={label} className={`rounded-lg p-3 ${bg} flex flex-col items-center text-center gap-1`}>
              {icon}
              <span className="text-lg font-bold leading-none">{value}</span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Badges</p>
          <ContributorBadges badges={badges} showLocked size="sm" />
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/contribute")}>
          <Upload className="w-3 h-3 mr-2" />Contribute Material
        </Button>
      </CardContent>
    </Card>
  );
}
