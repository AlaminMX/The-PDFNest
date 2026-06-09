import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, FileText, GraduationCap, Calendar, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFaculties } from "@/hooks/useFaculties";
import { useDepartments } from "@/hooks/useDepartments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { toast } from "sonner";

interface Project {
  id: string;
  title: string;
  abstract: string | null;
  author_name: string;
  supervisor_name: string | null;
  year: number | null;
  faculty_id: string | null;
  department_id: string | null;
  file_path: string;
  created_at: string;
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { faculties } = useFaculties();
  const [activeFaculty, setActiveFaculty] = useState<string>("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSubmit, setOpenSubmit] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = (supabase as any)
      .from("final_year_projects")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (activeFaculty !== "all") q = q.eq("faculty_id", activeFaculty);
    const { data } = await q;
    setProjects((data || []) as Project[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFaculty]);

  const openProject = async (p: Project) => {
    const { data, error } = await supabase.storage
      .from("project-files")
      .createSignedUrl(p.file_path, 60 * 10);
    if (error || !data?.signedUrl) {
      toast.error("Sign in required to view this project");
      navigate("/auth");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Final Year Projects
            </h1>
            <p className="text-xs text-muted-foreground">Browse and contribute student projects</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Tabs value={activeFaculty} onValueChange={setActiveFaculty}>
          <TabsList className="flex flex-wrap h-auto bg-muted/30 p-1 mb-5">
            <TabsTrigger value="all">All</TabsTrigger>
            {faculties.filter((f) => f.is_visible).map((f) => (
              <TabsTrigger key={f.id} value={f.id}>{f.name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">No projects yet</p>
            <p className="text-xs text-muted-foreground/70">Be the first to submit your final year project</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {projects.map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => openProject(p)}
                className="text-left p-5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-snug mb-1 line-clamp-2">{p.title}</h3>
                    {p.abstract && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{p.abstract}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    <span className="truncate">{p.author_name}</span>
                  </div>
                  {p.supervisor_name && (
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3 h-3" />
                      <span className="truncate">Supervised by {p.supervisor_name}</span>
                    </div>
                  )}
                  {p.year && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>{p.year}</span>
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </main>

      <Drawer open={openSubmit} onOpenChange={setOpenSubmit}>
        <DrawerTrigger asChild>
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 inline-flex items-center gap-2 pl-4 pr-5 py-3.5 rounded-full bg-primary text-primary-foreground shadow-[0_8px_28px_-6px_hsl(var(--primary)/0.5)] font-medium text-sm"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          >
            <Plus className="w-4 h-4" />
            Submit Project
          </motion.button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>Submit Final Year Project</DrawerTitle>
          </DrawerHeader>
          <SubmitProjectForm onDone={() => { setOpenSubmit(false); load(); }} />
        </DrawerContent>
      </Drawer>

      <SmartBottomNav />
    </div>
  );
}

function SubmitProjectForm({ onDone }: { onDone: () => void }) {
  const { faculties } = useFaculties();
  const { departments } = useDepartments();
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [author, setAuthor] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [facultyId, setFacultyId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredDepts = facultyId
    ? departments.filter((d: any) => d.faculty_id === facultyId)
    : departments;

  const submit = async () => {
    if (!title || !author || !file) {
      toast.error("Title, author, and file are required");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File must be under 50MB");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to submit");
        return;
      }
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("project-files")
        .upload(path, file, { contentType: file.type || "application/pdf" });
      if (upErr) throw upErr;

      const { error: insErr } = await (supabase as any).from("final_year_projects").insert({
        user_id: user.id,
        title,
        abstract: abstract || null,
        author_name: author,
        supervisor_name: supervisor || null,
        year: year ? parseInt(year, 10) : null,
        faculty_id: facultyId || null,
        department_id: departmentId || null,
        file_path: path,
        file_size: file.size,
      });
      if (insErr) throw insErr;

      toast.success("Project submitted for review");
      onDone();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 pb-6 space-y-3 overflow-y-auto">
      <div>
        <Label>Title *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" />
      </div>
      <div>
        <Label>Abstract</Label>
        <Textarea value={abstract} onChange={(e) => setAbstract(e.target.value)} rows={3} placeholder="Short description" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Author *</Label>
          <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>
        <div>
          <Label>Supervisor</Label>
          <Input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Year</Label>
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div>
          <Label>Faculty</Label>
          <Select value={facultyId} onValueChange={(v) => { setFacultyId(v); setDepartmentId(""); }}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {faculties.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Department</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {filteredDepts.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>PDF File *</Label>
        <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <p className="text-xs text-muted-foreground mt-1">Max 50MB. Submissions are reviewed before going live.</p>
      </div>
      <Button onClick={submit} disabled={submitting} className="w-full">
        {submitting ? "Submitting..." : "Submit for review"}
      </Button>
    </div>
  );
}
