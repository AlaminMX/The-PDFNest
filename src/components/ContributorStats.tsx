import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ContributorBadges } from "@/components/ContributorBadges";
import { useContributorStats } from "@/hooks/useContributorStats";
import { useCommunityUploads } from "@/hooks/useCommunityUploads";
import { Upload, Trophy, CheckCircle, Clock, Eye, Loader2, XCircle, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ContributorStatsProps {
  userId: string;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
    case "approved":
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
    case "rejected":
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

function PreviewButton({ filePath }: { filePath: string }) {
  const [loading, setLoading] = useState(false);
  const handlePreview = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.storage.from("school_pdfs").createSignedUrl(filePath, 300);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
      else toast.error("Could not generate preview link");
    } catch {
      toast.error("Preview failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handlePreview} disabled={loading}>
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3 mr-1" />}
      Preview
    </Button>
  );
}

export function ContributorStats({ userId }: ContributorStatsProps) {
  const navigate = useNavigate();
  const { stats, badges, departmentRank, loading: statsLoading } = useContributorStats(userId);
  const { uploads, loading: uploadsLoading } = useCommunityUploads({
    scope: "own",
    statusFilter: "all",
  });

  const loading = statsLoading;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No contributions yet — show CTA
  if (!stats && uploads.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Contributions
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">You haven't contributed yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload study materials to earn points and badges
            </p>
          </div>
          <Button size="sm" onClick={() => navigate("/contribute")}>
            Start Contributing
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tiles = [
    { icon: <Trophy className="w-4 h-4 text-amber-500" />, value: stats?.total_points ?? 0, label: "Points", bg: "bg-amber-500/10", clickable: false },
    { icon: <CheckCircle className="w-4 h-4 text-green-500" />, value: stats?.approved_count ?? 0, label: "Approved", bg: "bg-green-500/10", clickable: false },
    { icon: <Clock className="w-4 h-4 text-blue-500" />, value: stats?.pending_count ?? 0, label: "Pending", bg: "bg-blue-500/10", clickable: false },
    { icon: <Trophy className="w-4 h-4 text-primary" />, value: departmentRank ? `#${departmentRank}` : "—", label: "Dept. Rank", bg: "bg-primary/10", clickable: true },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Contributions
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => navigate("/leaderboard")}>
            <Trophy className="w-3 h-3 mr-1" />
            Leaderboard
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Stats tiles */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tiles.map(({ icon, value, label, bg, clickable }) => (
              <div
                key={label}
                className={`rounded-lg p-3 ${bg} flex flex-col items-center text-center gap-1 ${
                  clickable ? "cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" : ""
                }`}
                onClick={clickable ? () => navigate("/leaderboard") : undefined}
              >
                {icon}
                <span className="text-lg font-bold leading-none">{value}</span>
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Badges */}
        {stats && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Badges</p>
            <ContributorBadges badges={badges} showLocked size="sm" />
          </div>
        )}

        {/* My Submissions list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">My Submissions</p>
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => navigate("/contribute")}>
              <Upload className="w-3 h-3 mr-1" /> New
            </Button>
          </div>

          {uploadsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <FileText className="w-6 h-6 mx-auto mb-1 opacity-30" />
              <p className="text-xs">No submissions yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-medium truncate max-w-[200px]">{upload.title}</p>
                      <StatusBadge status={upload.status} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {upload.course_code ? `${upload.course_code} · ` : ""}
                      {upload.material_type.replace("_", " ")}
                      {upload.created_at ? ` · ${format(new Date(upload.created_at), "MMM d")}` : ""}
                    </p>
                    {upload.status === "rejected" && upload.review_note && (
                      <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1">
                        <XCircle className="w-2.5 h-2.5 shrink-0" />
                        {upload.review_note}
                      </p>
                    )}
                  </div>
                  <PreviewButton filePath={upload.file_path} />
                </div>
              ))}
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
