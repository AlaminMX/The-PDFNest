import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, FileText, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAdminStatus } from "@/hooks/useAdminStatus";

interface Row {
  id: string;
  title: string;
  abstract: string | null;
  author_name: string;
  supervisor_name: string | null;
  year: number | null;
  file_path: string;
  status: string;
  created_at: string;
}

export default function AdminProjects() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("final_year_projects")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false });
    setRows((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!adminLoading && isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isAdmin, adminLoading]);

  const review = async (id: string, newStatus: "approved" | "rejected") => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await (supabase as any)
      .from("final_year_projects")
      .update({
        status: newStatus,
        reviewed_by: user.id,
        review_note: notes[id] || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Project ${newStatus}`);
    load();
  };

  const openFile = async (path: string) => {
    const { data } = await supabase.storage.from("project-files").createSignedUrl(path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  if (adminLoading) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  return (
    <AdminShell
      title="Final Year Projects"
      subtitle="Review and moderate submissions"
      icon={<FileText className="w-5 h-5 text-primary" />}
    >
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Tabs value={status} onValueChange={(v) => setStatus(v as any)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
          <TabsContent value={status} className="mt-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 rounded-xl bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <p className="text-center py-12 text-sm text-muted-foreground">No {status} projects</p>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">{r.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {r.author_name}{r.supervisor_name ? ` · Supervised by ${r.supervisor_name}` : ""}{r.year ? ` · ${r.year}` : ""}
                        </p>
                        {r.abstract && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{r.abstract}</p>}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openFile(r.file_path)} className="shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {status === "pending" && (
                      <>
                        <Textarea
                          value={notes[r.id] || ""}
                          onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                          placeholder="Review note (optional)"
                          rows={2}
                          className="text-xs"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => review(r.id, "approved")} className="flex-1">
                            <Check className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => review(r.id, "rejected")} className="flex-1">
                            <X className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </AdminShell>
  );
}
