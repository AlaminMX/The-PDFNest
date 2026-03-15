import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Trash2, GraduationCap, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const ALL_LEVELS = [100, 200, 300, 400, 500];

interface CourseEntry {
  id: string;
  code: string;
  name: string;
  level: number;
  semester: string;
  credit_units: number;
}

interface LevelGroup {
  level: number;
  courses: CourseEntry[];
}

export default function AdminDepartmentLevels() {
  const navigate = useNavigate();
  const { deptId } = useParams<{ deptId: string }>();
  const { isAdmin } = useAdminStatus();

  const [deptName, setDeptName] = useState("");
  const [groups, setGroups] = useState<LevelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New course form
  const [newLevel, setNewLevel] = useState<number>(100);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newSemester, setNewSemester] = useState("first");
  const [newCredits, setNewCredits] = useState("3");

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<CourseEntry | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
  }, [isAdmin, deptId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: deptData } = await supabase
        .from("departments").select("name").eq("id", deptId).maybeSingle();
      setDeptName(deptData?.name ?? "");

      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, code, name, level, semester, credit_units")
        .eq("department_id", deptId)
        .order("level").order("code");

      const courses = (coursesData || []) as CourseEntry[];
      const grouped = ALL_LEVELS.map((level) => ({
        level,
        courses: courses.filter((c) => c.level === level),
      }));
      setGroups(grouped);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async () => {
    if (!newCode.trim() || !newName.trim()) {
      toast.error("Course code and name are required");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("courses").insert({
        department_id: deptId,
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        level: newLevel,
        semester: newSemester,
        credit_units: parseInt(newCredits) || 3,
      });
      if (error) throw error;
      toast.success("Course added");
      setNewCode(""); setNewName(""); setNewCredits("3");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add course");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("courses").delete().eq("id", deleteTarget.id);
    if (error) { toast.error("Failed to delete course"); return; }
    toast.success("Course removed");
    setDeleteTarget(null);
    fetchData();
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-16">
      <PageHeader title={`${deptName} — Levels`} subtitle="Manage courses by level" showBack backTo="/admin/departments" />

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">

        {/* Add course form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="w-4 h-4" /> Add Course
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Level</Label>
                <Select value={String(newLevel)} onValueChange={(v) => setNewLevel(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_LEVELS.map((l) => <SelectItem key={l} value={String(l)}>{l} Level</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Semester</Label>
                <Select value={newSemester} onValueChange={setNewSemester}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">First Semester</SelectItem>
                    <SelectItem value="second">Second Semester</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Course Code</Label>
                <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. CSC 301" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Course Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Data Structures" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div className="space-y-1 w-28">
                <Label className="text-xs">Credit Units</Label>
                <Input type="number" min={1} max={10} value={newCredits} onChange={(e) => setNewCredits(e.target.value)} />
              </div>
              <Button onClick={handleAddCourse} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Course
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Level groups */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          groups.map(({ level, courses }) => (
            <Card key={level}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    {level} Level
                  </span>
                  <Badge variant="secondary">{courses.length} course{courses.length !== 1 ? "s" : ""}</Badge>
                </CardTitle>
              </CardHeader>
              {courses.length > 0 && (
                <CardContent className="px-4 pb-4 pt-0 space-y-2">
                  {courses.map((course) => (
                    <div key={course.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{course.code}</p>
                          <p className="text-xs text-muted-foreground truncate">{course.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px]">
                          {course.semester === "first" ? "1st" : "2nd"} sem
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{course.credit_units} CU</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(course)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </main>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deleteTarget?.code}</strong> — {deleteTarget?.name}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCourse} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
