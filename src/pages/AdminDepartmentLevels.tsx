import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, GraduationCap, BookOpen, Loader2, ChevronDown, ChevronRight, PlusCircle, Check, X, GitMerge, Clock, Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { ALL_SUPPORTED_LEVELS, formatLevelLabel, getDepartmentLevelsFromDb } from "@/lib/departmentLevels";

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
  exists: boolean;
}

interface DepartmentData {
  id: string;
  name: string;
  allowed_levels: number[] | null;
}

export default function AdminDepartmentLevels() {
  const { deptId } = useParams<{ deptId: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();

  const [deptName, setDeptName] = useState("");
  const [allowedLevels, setAllowedLevels] = useState<number[]>([]);
  const [groups, setGroups] = useState<LevelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [openLevels, setOpenLevels] = useState<Set<number>>(new Set());
  const [addingToLevel, setAddingToLevel] = useState<number | null>(null);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newSemester, setNewSemester] = useState("first");
  const [newCredits, setNewCredits] = useState("3");

  const [editingCourse, setEditingCourse] = useState<CourseEntry | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editSemester, setEditSemester] = useState("first");
  const [editCredits, setEditCredits] = useState("3");
  const [editLevel, setEditLevel] = useState("100");

  const [deleteTarget, setDeleteTarget] = useState<CourseEntry | null>(null);
  const [mergeSource, setMergeSource] = useState<CourseEntry | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");

  const [editingDepartment, setEditingDepartment] = useState(false);
  const [draftDeptName, setDraftDeptName] = useState("");
  const [draftAllowedLevels, setDraftAllowedLevels] = useState<number[]>([]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (!isAdmin || !deptId) return;
    fetchData();
  }, [isAdmin, deptId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: deptData, error: deptError } = await supabase
        .from("departments")
        .select("id, name, allowed_levels")
        .eq("id", deptId)
        .single();

      if (deptError) throw deptError;

      const department = deptData as DepartmentData;
      const normalizedAllowedLevels = getDepartmentLevelsFromDb(department.allowed_levels);

      setDeptName(department.name);
      setAllowedLevels(normalizedAllowedLevels);
      setDraftDeptName(department.name);
      setDraftAllowedLevels(normalizedAllowedLevels);

      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("id, code, name, level, semester, credit_units, status")
        .eq("department_id", deptId)
        .order("level")
        .order("code");

      if (coursesError) throw coursesError;

      const courses = (coursesData || []) as CourseEntry[];

      const grouped = normalizedAllowedLevels.map((level) => {
        const levelCourses = courses.filter((c) => c.level === level);
        return { level, courses: levelCourses, exists: levelCourses.length > 0 };
      });

      setGroups(grouped);
      setOpenLevels(new Set(grouped.map((g) => g.level)));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load department data");
    } finally {
      setLoading(false);
    }
  };

  const approvedCoursesForMerge = useMemo(() => {
    if (!mergeSource) return [];
    return groups
      .find((g) => g.level === mergeSource.level)
      ?.courses.filter((c) => c.id !== mergeSource.id && c.status === "approved") || [];
  }, [mergeSource, groups]);

  const toggleLevel = (level: number) => {
    setOpenLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  const resetAddForm = () => {
    setNewCode("");
    setNewName("");
    setNewSemester("first");
    setNewCredits("3");
    setAddingToLevel(null);
  };

  const toggleAllowedLevelDraft = (level: number) => {
    setDraftAllowedLevels((prev) => {
      if (prev.includes(level)) {
        return prev.filter((l) => l !== level).sort((a, b) => a - b);
      }
      return [...prev, level].sort((a, b) => a - b);
    });
  };

  const handleSaveDepartment = async () => {
    const trimmedName = draftDeptName.trim();

    if (!trimmedName) {
      toast.error("Department name is required");
      return;
    }

    if (draftAllowedLevels.length === 0) {
      toast.error("Select at least one level");
      return;
    }

    const blockedLevels = groups
      .filter((group) => !draftAllowedLevels.includes(group.level) && group.courses.length > 0)
      .map((group) => group.level);

    if (blockedLevels.length > 0) {
      toast.error(`You cannot disable ${blockedLevels.join(", ")} Level because it still has courses`);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("departments")
        .update({
          name: trimmedName,
          allowed_levels: draftAllowedLevels,
        } as any)
        .eq("id", deptId);

      if (error) throw error;

      toast.success("Department updated");
      setEditingDepartment(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update department");
    } finally {
      setSaving(false);
    }
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
        status: "approved",
      } as any);

      if (error) throw error;

      toast.success(`Course added to ${formatLevelLabel(level)}`);
      resetAddForm();
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add course");
    } finally {
      setSaving(false);
    }
  };

  const openEditCourse = (course: CourseEntry) => {
    setEditingCourse(course);
    setEditCode(course.code);
    setEditName(course.name);
    setEditSemester(course.semester);
    setEditCredits(String(course.credit_units));
    setEditLevel(String(course.level));
  };

  const handleSaveEditedCourse = async () => {
    if (!editingCourse) return;
    if (!editCode.trim() || !editName.trim()) {
      toast.error("Course code and name are required");
      return;
    }

    const parsedLevel = parseInt(editLevel);
    if (!allowedLevels.includes(parsedLevel)) {
      toast.error("That level is not enabled for this department");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("courses")
        .update({
          code: editCode.trim().toUpperCase(),
          name: editName.trim(),
          level: parsedLevel,
          semester: editSemester,
          credit_units: parseInt(editCredits) || 3,
        } as any)
        .eq("id", editingCourse.id);

      if (error) throw error;

      toast.success("Course updated");
      setEditingCourse(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update course");
    } finally {
      setSaving(false);
    }
  };

  const handleApproveCourse = async (courseId: string) => {
    const { error } = await supabase
      .from("courses")
      .update({ status: "approved" } as any)
      .eq("id", courseId);

    if (error) {
      toast.error("Failed to approve");
      return;
    }

    toast.success("Course approved");
    fetchData();
  };

  const handleRejectCourse = async (courseId: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", courseId);

    if (error) {
      toast.error("Failed to reject");
      return;
    }

    toast.success("Pending course removed");
    fetchData();
  };

  const handleMergeCourse = async () => {
    if (!mergeSource || !mergeTargetId) return;

    setSaving(true);
    try {
      await supabase
        .from("community_uploads")
        .update({ course_id: mergeTargetId } as any)
        .eq("course_id", mergeSource.id);

      const { error } = await supabase.from("courses").delete().eq("id", mergeSource.id);
      if (error) throw error;

      toast.success("Course merged");
      setMergeSource(null);
      setMergeTargetId("");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to merge");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("courses").delete().eq("id", deleteTarget.id);

      if (error) throw error;

      toast.success("Course removed");
      setDeleteTarget(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  if (adminLoading || (loading && !deptName)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-16">
      <PageHeader
        title={`${deptName || "Department"} — Levels`}
        subtitle="Edit department levels and courses"
        showBack
        backTo="/admin/departments"
      />

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Department Settings</CardTitle>
            {!editingDepartment ? (
              <Button size="sm" variant="outline" onClick={() => setEditingDepartment(true)}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => {
                  setEditingDepartment(false);
                  setDraftDeptName(deptName);
                  setDraftAllowedLevels(allowedLevels);
                }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveDepartment} disabled={saving}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Department Name</Label>
              <Input
                value={editingDepartment ? draftDeptName : deptName}
                onChange={(e) => setDraftDeptName(e.target.value)}
                disabled={!editingDepartment}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Allowed Levels</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_SUPPORTED_LEVELS.map((level) => {
                  const active = (editingDepartment ? draftAllowedLevels : allowedLevels).includes(level);
                  return (
                    <button
                      key={level}
                      type="button"
                      disabled={!editingDepartment}
                      onClick={() => toggleAllowedLevelDraft(level)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      } ${!editingDepartment ? "cursor-default" : "hover:border-primary/50"}`}
                    >
                      {formatLevelLabel(level)}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {groups.map(({ level, courses, exists }) => {
          const isOpen = openLevels.has(level);
          const isAddingHere = addingToLevel === level;

          return (
            <Card key={level} className="overflow-hidden">
              <CardHeader className="py-0 px-0">
                <button
                  type="button"
                  onClick={() => toggleLevel(level)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                >
                  <CardTitle className="flex items-center gap-2.5 text-sm font-semibold">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <GraduationCap className="w-4 h-4 text-primary" />
                    {formatLevelLabel(level)}
                  </CardTitle>

                  <Badge variant={exists ? "secondary" : "outline"} className="text-[11px]">
                    {courses.length} {courses.length === 1 ? "course" : "courses"}
                  </Badge>
                </button>
              </CardHeader>

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
                            {course.status === "pending" && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] gap-1 border-yellow-500/40 text-yellow-700 dark:text-yellow-400 bg-yellow-500/10"
                              >
                                <Clock className="w-2.5 h-2.5" />
                                pending
                              </Badge>
                            )}

                            <Badge variant="outline" className="text-[10px]">
                              {course.semester === "first" ? "1st" : "2nd"} sem
                            </Badge>

                            <Badge variant="outline" className="text-[10px]">
                              {course.credit_units} CU
                            </Badge>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditCourse(course)}
                              title="Edit course"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>

                            {course.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                  title="Approve"
                                  onClick={() => handleApproveCourse(course.id)}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:bg-muted"
                                  title="Merge"
                                  onClick={() => {
                                    setMergeSource(course);
                                    setMergeTargetId("");
                                  }}
                                >
                                  <GitMerge className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                              onClick={() =>
                                course.status === "pending" ? handleRejectCourse(course.id) : setDeleteTarget(course)
                              }
                            >
                              {course.status === "pending" ? (
                                <X className="w-3.5 h-3.5" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}

                      {isAddingHere ? (
                        <div className="border border-primary/20 rounded-lg p-3 space-y-3 bg-primary/[0.02]">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            New course — {formatLevelLabel(level)}
                          </p>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Semester</Label>
                              <Select value={newSemester} onValueChange={setNewSemester}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="first">First</SelectItem>
                                  <SelectItem value="second">Second</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Credit Units</Label>
                              <Input
                                type="number"
                                min={1}
                                max={10}
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
                              />
                            </div>

                            <div className="col-span-2 space-y-1">
                              <Label className="text-xs">Name</Label>
                              <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Course name"
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 h-8 text-xs gap-1.5"
                              onClick={() => handleAddCourse(level)}
                              disabled={saving}
                            >
                              {saving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              Add
                            </Button>

                            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={resetAddForm} disabled={saving}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            resetAddForm();
                            setAddingToLevel(level);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Add course to {formatLevelLabel(level)}
                        </button>
                      )}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </main>

      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-xl border shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold">Edit Course</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Code</Label>
                <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} />
              </div>

              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Level</Label>
                <Select value={editLevel} onValueChange={setEditLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedLevels.map((level) => (
                      <SelectItem key={level} value={String(level)}>
                        {formatLevelLabel(level)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Semester</Label>
                <Select value={editSemester} onValueChange={setEditSemester}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">First</SelectItem>
                    <SelectItem value="second">Second</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Credit Units</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={editCredits}
                  onChange={(e) => setEditCredits(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingCourse(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditedCourse} disabled={saving}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {mergeSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-xl border shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold">Merge Pending Course</h3>
            <p className="text-sm text-muted-foreground">
              Merge <strong>{mergeSource.code}</strong> into an existing approved course. All uploads will be moved.
            </p>

            <div className="space-y-1">
              <Label className="text-xs">Target course</Label>
              <select
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
              >
                <option value="">Select course...</option>
                {approvedCoursesForMerge.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setMergeSource(null)}>
                Cancel
              </Button>
              <Button size="sm" disabled={!mergeTargetId || saving} onClick={handleMergeCourse} className="gap-1.5">
                <GitMerge className="w-3.5 h-3.5" />
                Merge
              </Button>
            </div>
          </div>
        </div>
      )}

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

      <SmartBottomNav />
    </div>
  );
}
