import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Clock3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatActivity } from "@/lib/formatActivity";

const eventTime = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  dateStyle: "medium",
  timeStyle: "medium",
});

export function RecentActivity() {
  const activity = useQuery({
    queryKey: ["admin-recent-activity"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    queryFn: async ({ signal }) => {
      const { data: logs, error } = await supabase
        .from("user_activity_logs")
        .select("id, user_id, activity_type, details, created_at")
        .not("activity_type", "in", "(SESSION_START,SESSION_END,session_start,session_end)")
        .order("created_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .limit(250)
        .abortSignal(signal);
      if (error) throw error;

      const latest = new Map<string, (typeof logs)[number]>();
      for (const log of logs) {
        if (!latest.has(log.user_id)) latest.set(log.user_id, log);
        if (latest.size === 12) break;
      }
      if (latest.size === 0) return [];

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, nickname, email")
        .in("id", [...latest.keys()])
        .abortSignal(signal);
      if (profileError) throw profileError;
      const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

      return [...latest.values()].flatMap((event) => {
        const profile = profilesById.get(event.user_id);
        if (!profile) return [];
        return [{
          ...event,
          ...formatActivity(event.activity_type, event.details),
          name: profile.nickname || profile.full_name || profile.email?.split("@")[0] || "Unnamed account",
        }];
      });
    },
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Clock3 className="h-4 w-4 text-primary" />
          Recent activity
        </h3>
        <p className="text-xs text-muted-foreground">Updates every 5 seconds · West Africa Time</p>
      </div>
      {activity.isPending && <p role="status" className="text-sm text-muted-foreground">Loading recent activity…</p>}
      {activity.isError && <p role="status" className="text-sm text-muted-foreground">Couldn’t refresh recent activity. Retrying automatically.</p>}
      {activity.data?.length === 0 && <p className="text-sm text-muted-foreground">No recent activity recorded.</p>}
      <ul className="divide-y">
        {activity.data?.map((event) => (
          <li key={event.user_id}>
            <Link to={`/admin/user/${event.user_id}#student-activity`} className="flex flex-wrap items-start justify-between gap-2 rounded px-2 py-2 hover:bg-muted focus-visible:outline-primary">
              <span className="min-w-0">
                <span className="block text-sm font-medium">{event.name}</span>
                <span className="block break-words text-xs text-muted-foreground">
                  {event.label}{event.detail && ` · ${event.detail}`}
                </span>
              </span>
              {event.created_at && (
                <time dateTime={event.created_at} className="text-xs text-muted-foreground">
                  {eventTime.format(new Date(event.created_at))}
                </time>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
