import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Json } from "@/integrations/supabase/types";

type EventGroup = "Reading" | "Downloads" | "Uploads" | "Browsing" | "Account" | "Other";
const groups: EventGroup[] = ["Reading", "Downloads", "Uploads", "Browsing", "Account", "Other"];
const eventTypes: Record<string, [string, EventGroup]> = {
  PAGE_VIEW: ["Visited a page", "Browsing"],
  PDF_VIEW: ["Opened a PDF", "Reading"],
  PDF_OPEN: ["Opened a PDF", "Reading"],
  VIEW_PDF: ["Opened a PDF", "Reading"],
  OPEN_PDF: ["Opened a PDF", "Reading"],
  LECTURE_NOTE_VIEW: ["Opened a lecture note", "Reading"],
  FILE_DOWNLOAD: ["Downloaded a PDF", "Downloads"],
  DOWNLOAD_PDF: ["Downloaded a PDF", "Downloads"],
  FILE_UPLOAD: ["Uploaded a PDF", "Uploads"],
  UPLOAD_PDF: ["Uploaded a PDF", "Uploads"],
  LECTURE_NOTE_UPLOAD: ["Uploaded a lecture note", "Uploads"],
  CONTRIBUTE_UPLOAD: ["Submitted material for review", "Uploads"],
  LOGIN: ["Signed in", "Account"],
  LOGIN_SUCCESS: ["Signed in", "Account"],
  LOGIN_FAILED: ["Sign-in failed", "Account"],
  LOGOUT: ["Signed out", "Account"],
  SESSION_START: ["Started a session", "Account"],
  SESSION_END: ["Ended a session", "Account"],
};

const timeZone = "Africa/Lagos";
const dateKey = (date: Date) => new Date(date.getTime() + 3_600_000).toISOString().slice(0, 10);
const dayLabel = new Intl.DateTimeFormat("en-NG", { timeZone, month: "short", day: "numeric" });
const eventTime = new Intl.DateTimeFormat("en-NG", { timeZone, dateStyle: "medium", timeStyle: "short" });
const dayMs = 86_400_000;
const pageSize = 250;
const maxEvents = 2000;
const timelineSize = 20;

function object(value: Json | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function describe(details: Json | null) {
  const metadata = object(details);
  const context = object(metadata.context);
  const fields = { ...metadata, ...context, ...object(context.details) };
  const title = [fields.title, fields.fileName, fields.newName].find((value): value is string => typeof value === "string" && !!value);
  const course = typeof fields.courseCode === "string" ? fields.courseCode : null;
  if (title) return [title, course].filter(Boolean).join(" · ");

  const route = [fields.path, fields.page, metadata.resource].find((value): value is string => typeof value === "string" && value.startsWith("/"));
  const path = route?.split(/[?#]/)[0];
  if (path === "/") return "Home";
  if (path === "/dashboard") return "Dashboard";
  if (path === "/profile") return "Profile";
  if (path === "/onboarding") return "Account setup";
  if (path === "/contribute") return "Contribute materials";
  if (path?.startsWith("/afit-pdfs")) return "AFIT library";
  if (path?.startsWith("/past-questions")) return "Past questions";
  return course;
}

export function StudentActivity({ userId }: { userId: string }) {
  const [days, setDays] = useState(7);
  const [group, setGroup] = useState<EventGroup | "all">("all");
  const [page, setPage] = useState(1);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin-student-activity", userId, days],
    queryFn: async ({ signal }) => {
      const today = dateKey(new Date());
      const start = new Date(`${today}T00:00:00+01:00`).getTime() - (days - 1) * dayMs;
      const daily = Array.from({ length: days }, (_, offset) => ({
        day: dayLabel.format(new Date(start + offset * dayMs)),
        key: dateKey(new Date(start + offset * dayMs)),
        events: 0,
      }));
      const events = [];
      for (let offset = 0; offset <= maxEvents; offset += pageSize) {
        const { data: rows, error } = await supabase
          .from("user_activity_logs")
          .select("id, activity_type, details, created_at")
          .eq("user_id", userId)
          .gte("created_at", new Date(start).toISOString())
          .lt("created_at", new Date(start + days * dayMs).toISOString())
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, Math.min(offset + pageSize - 1, maxEvents))
          .abortSignal(signal);
        if (error) throw error;
        for (const row of rows) {
          const [label, group] = eventTypes[row.activity_type.toUpperCase()] ??
            [row.activity_type.toLowerCase().replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase()), "Other" as const];
          events.push({
            id: row.id,
            time: new Date(row.created_at),
            label,
            group,
            detail: describe(row.details),
          });
        }
        if (rows.length < pageSize) break;
      }
      return { daily, events: events.slice(0, maxEvents), truncated: events.length > maxEvents };
    },
  });

  const summary = useMemo(() => {
    const daily = (data?.daily ?? []).map((day) => ({ ...day }));
    const byDate = new Map(daily.map((day) => [day.key, day]));
    const counts = new Map<EventGroup, number>();
    for (const event of data?.events ?? []) {
      if (group === "all" || event.group === group) {
        const day = byDate.get(dateKey(event.time));
        if (day) day.events++;
      }
      counts.set(event.group, (counts.get(event.group) ?? 0) + 1);
    }
    return { daily, counts };
  }, [data, group]);
  const filtered = (data?.events ?? []).filter((event) => group === "all" || event.group === group);

  return (
    <Card id="student-activity" className="scroll-mt-20">
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" />
          Student activity
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Select value={String(days)} onValueChange={(value) => { setDays(Number(value)); setPage(1); }}>
            <SelectTrigger className="w-32" aria-label="Activity period"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={group} onValueChange={(value) => { setGroup(value as EventGroup | "all"); setPage(1); }}>
            <SelectTrigger className="w-36" aria-label="Activity type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All activity</SelectItem>
              {groups.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending && <p role="status">Loading activity…</p>}
        {isError && (
          <div role="alert" className="flex items-center gap-2">
            <p>Couldn’t load this student’s activity.</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>Retry</Button>
          </div>
        )}
        {data && (
          <>
            <p className="text-sm text-muted-foreground">
              West Africa Time{data.truncated && ` · Showing the most recent ${maxEvents.toLocaleString()} events in this period`}
            </p>
            <dl className="grid grid-cols-3 gap-2">
              {(["Reading", "Downloads", "Uploads"] as const).map((type) => (
                <div key={type} className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">{type === "Reading" ? "PDF opens" : type}</dt>
                  <dd className="text-xl font-semibold">{summary.counts.get(type) ?? 0}</dd>
                </div>
              ))}
            </dl>
            {filtered.length > 0 ? (
              <>
                <div className="h-44 w-full" role="img" aria-label={`Daily event counts: ${summary.daily.map((day) => `${day.day}: ${day.events}`).join(", ")}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.daily} margin={{ left: -26, top: 4 }}>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" minTickGap={24} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--popover))", borderColor: "hsl(var(--border))", color: "hsl(var(--popover-foreground))" }} />
                      <Bar dataKey="events" name="Events" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ol className="divide-y">
                  {filtered.slice(0, page * timelineSize).map((event) => (
                    <li key={event.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{event.label}</p>
                        {event.detail && <p className="break-words text-sm text-muted-foreground">{event.detail}</p>}
                      </div>
                      <time className="text-xs text-muted-foreground" dateTime={event.time.toISOString()}>{eventTime.format(event.time)}</time>
                    </li>
                  ))}
                </ol>
                {filtered.length > page * timelineSize && (
                  <Button size="sm" variant="outline" onClick={() => setPage(page + 1)}>Show older activity</Button>
                )}
              </>
            ) : <p className="text-sm text-muted-foreground">No matching activity in this period.</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
