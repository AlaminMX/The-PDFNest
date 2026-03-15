import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, GraduationCap, BookOpen, Loader2, ChevronDown, ChevronRight, PlusCircle, Check, X, GitMerge, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";

const ALL_LEVELS = [100, 200, 300, 400, 500];

const LEVEL_LABELS: Record<number, string> = {
  100: "100 Level", 200: "200 Level", 300: "300 Level",
  400: "400 Level", 500: "500 Level",
};

interface CourseEntry {
  id: string;
  code: string;
  name: string;
  level: number;
  semester: string;
  credit_units: number;
  status: string;
}

interface LevelGroup {
  level: number;
  courses: CourseEntry[];
  /** whether the level exists for this dept (has at least 1 course) */
  exists: boolean;
}

export default function AdminDepartmentLevels() {
  const { deptId } = useParams<{ deptId: string }>();
  const { isAdmin } = useAdminStatus();

  const [deptName, setDeptName] = useState("");
  const [groups, setGroups] = useState<LevelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Which level cards are expanded
  const [openLevels, setOpenLevels] = useState<Set<number>>(new Set([100]));
  // Which levels have the "add course" form open
  const [addingToLevel, setAddingToLevel] = useState<number | null>(null);

  // Per-level add form state
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newSemester, setNewSemester] = useState("first");
  const [newCredits, setNewCredits] = useState("3");

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<CourseEntry | null>(null);
  // Remove-level dialog
  const [removeLevelTarget, setRemoveLevelTarget] = useState<number | null>(null);
  const [removingLevel, setRemovingLevel] = useState(false);
  // Merge dialog
  const [mergeSource, setMergeSource] = useState<CourseEntry | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");

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
        .select("id, code, name, level, semester, credit_units, status")
        .eq("department_id", deptId)
        .order("level").order("code");

      const courses = (coursesData || []) as CourseEntry[];
      const grouped = ALL_LEVELS.map((level) => {
        const levelCourses = courses.filter((c) => c.level === level);
        return { level, courses: levelCourses, exists: levelCourses.length > 0 };
      });
      setGroups(grouped);

      // Auto-open levels that have courses
      setOpenLevels(new Set(grouped.filter(g => g.exists).map(g => g.level)));
    } finally {
      setLoading(false);
    }
  };

  const toggleLevel = (level: number) => {
    setOpenLevels(prev => {
      const next = new Set(prev);
      next.has(level) ? next.delete(level) : next.add(level);
      return next;
    });
  };

  const resetForm = () => {
    setNewCode(""); setNewName(""); setNewSemester("first"); setNewCredits("3");
    setAddingToLevel(null);
  };

  const handleAddCourse = async (level: number) => {
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
        level,
        semester: newSemester,
        credit_units: parseInt(newCredits) || 3,
      });
      if (error) throw error;
      toast.success(`Course added to ${level} Level`);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add course");
    } finally {
      setSaving(false);
    }
  };

  const handleApproveCourse = async (courseId: string) => {
    const { error } = await supabase
      .from("courses")
      .update({ status: "approved" } as any)
      .eq("id", courseId);
    if (error) { toast.error("Failed to approve course"); return; }
    toast.success("Course approved");
    fetchData();
  };

  const handleRejectCourse = async (courseId: string) => {
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId);
    if (error) { toast.error("Failed to reject course"); return; }
    toast.success("Pending course removed");
    fetchData();
  };

  const handleMergeCourse = async () => {
    if (!mergeSource || !mergeTargetId) return;
    // Move all community_uploads from the pending course to the target course
    await supabase
      .from("community_uploads")
      .update({ course_id: mergeTargetId })
      .eq("course_id", mergeSource.id);
    // Delete the pending course
    const { error } = await supabase.from("courses").delete().eq("id", mergeSource.id);
    if (error) { toast.error("Failed to merge"); return; }
    toast.success("Course merged");
    setMergeSource(null);
    setMergeTargetId("");
    fetchData();
  };

  const handleDeleteCourse = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("courses").delete().eq("id", deleteTarget.id);
    if (error) { toast.error("Failed to delete course"); return; }
    toast.success("Course removed");
    setDeleteTarget(null);
    fetchData();
  };

  /** Remove an entire level by deleting ALL courses in that level for this dept */
  const handleRemoveLevel = async () => {
    if (!removeLevelTarget) return;
    setRemovingLevel(true);
    try {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("department_id", deptId)
        .eq("level", removeLevelTarget);
      if (error) throw error;
      toast.success(`${removeLevelTarget} Level removed`);
      setRemoveLevelTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove level");
    } finally {
      setRemovingLevel(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-16">
      <PageHeader
        title={`${deptName || "Department"} — Levels`}
        subtitle="Add or remove levels and courses"
        showBack
        backTo="/admin/departments"
      />

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          groups.map(({ level, courses, exists }) => {
            const isOpen = openLevels.has(level);
            const isAddingHere = addingToLevel === level;

            return (
              <Card key={level} className="overflow-hidden">
                {/* ── Level header row ── */}
                <CardHeader className="py-0 px-0">
                  <button
                    type="button"
                    onClick={() => toggleLevel(level)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <CardTitle className="flex items-center gap-2.5 text-sm font-semibold">
                      {isOpen
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      <GraduationCap className="w-4 h-4 text-primary" />
                      {LEVEL_LABELS[level]}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={exists ? "secondary" : "outline"} className="text-[11px]">
                        {courses.length} {courses.length === 1 ? "course" : "courses"}
                      </Badge>
                      {/* Remove level button — only if it has courses */}
                      {exists && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setRemoveLevelTarget(level); }}
                          className="p-1 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove this level"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </button>
                </CardHeader>

                {/* ── Collapsible content ── */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <CardContent className="px-4 pb-4 pt-1 space-y-2">
                        {/* Course list */}
                        {courses.map((course) => (
                          <div
                            key={course.id}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <BookOpen className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{course.code}</p>
                                <p className="text-xs text-muted-foreground truncate">{course.name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                              {(course as any).status === "pending" && (
                                <Badge variant="secondary" className="text-[10px] gap-1 border-yellow-500/40 text-yellow-700 dark:text-yellow-400 bg-yellow-500/10">
                                  <Clock className="w-2.5 h-2.5" /> pending
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[10px]">
                                {course.semester === "first" ? "1st" : "2nd"} sem
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {course.credit_units} CU
                              </Badge>
                              {(course as any).status === "pending" && (
                                <>
                                  <Button
                                    variant="ghost" size="icon"
                                    className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                    title="Approve course"
                                    onClick={() => handleApproveCourse(course.id)}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                                    title="Merge into existing course"
                                    onClick={() => { setMergeSource(course); setMergeTargetId(""); }}
                                  >
                                    <GitMerge className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                                title={(course as any).status === "pending" ? "Reject & delete" : "Delete course"}
                                onClick={() => (course as any).status === "pending" ? handleRejectCourse(course.id) : setDeleteTarget(course)}
                              >
                                {(course as any).status === "pending" ? <X className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </Button>
                            </div>
                          </div>
                        ))}

                        {/* Add course inline form */}
                        {isAddingHere ? (
                          <div className="border border-primary/20 rounded-lg p-3 space-y-3 bg-primary/[0.02]">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              New course — {LEVEL_LABELS[level]}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Semester</Label>
                                <Select value={newSemester} onValueChange={setNewSemester}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="first">First</SelectItem>
                                    <SelectItem value="second">Second</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Credit Units</Label>
                                <Input
                                  type="number" min={1} max={10}
                                  value={newCredits}
                                  onChange={(e) => setNewCredits(e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Code</Label>
                                <Input
                                  value={newCode}
                                  onChange={(e) => setNewCode(e.target.value)}
                                  placeholder="CSC 301"
                                  className="h-8 text-xs"
                                  onKeyDown={(e) => e.key === "Enter" && handleAddCourse(level)}
                                />
                              </div>
                              <div className="col-span-2 space-y-1">
                                <Label className="text-xs">Name</Label>
                                <Input
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  placeholder="Course name"
                                  className="h-8 text-xs"
                                  onKeyDown={(e) => e.key === "Enter" && handleAddCourse(level)}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm" className="flex-1 h-8 text-xs gap-1.5"
                                onClick={() => handleAddCourse(level)}
                                disabled={saving}
                              >
                                {saving
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <Plus className="w-3.5 h-3.5" />}
                                Add
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                className="h-8 text-xs"
                                onClick={resetForm}
                                disabled={saving}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { resetForm(); setAddingToLevel(level); }}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            Add course to {LEVEL_LABELS[level]}
                          </button>
                        )}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })
        )}
      </main>

      {/* Merge course dialog */}
      {mergeSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-xl border shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold">Merge Pending Course</h3>
            <p className="text-sm text-muted-foreground">
              Merge <strong>{mergeSource.code}</strong> into an existing approved course. All uploads will be moved to the target course.
            </p>
            <div className="space-y-1">
              <Label className="text-xs">Target course</Label>
              <select
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
              >
                <option value="">Select course...</option>
                {groups
                  .find(g => g.level === mergeSource.level)
                  ?.courses
                  .filter(c => c.id !== mergeSource.id && (c as any).status === "approved")
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setMergeSource(null)}>Cancel</Button>
              <Button size="sm" disabled={!mergeTargetId} onClick={handleMergeCourse} className="gap-1.5">
                <GitMerge className="w-3.5 h-3.5" /> Merge
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete course dialog */}
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

      {/* Remove level dialog */}
      <AlertDialog open={!!removeLevelTarget} onOpenChange={(open) => !open && setRemoveLevelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeLevelTarget} Level?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete <strong>all {groups.find(g => g.level === removeLevelTarget)?.courses.length} courses</strong> in {removeLevelTarget} Level for this department. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingLevel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveLevel}
              disabled={removingLevel}
              className="bg-destructive hover:bg-destructive/90"
            >
              {removingLevel ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remove Level
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
