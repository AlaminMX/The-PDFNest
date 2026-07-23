import { AdminShell } from "@/components/AdminShell";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, Edit2, Loader2, FileText, BookOpen, Eye, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PQCourse {
  id: string; code: string; name: string; level: number; semester: string; color: string | null; created_at: string | null; question_count?: number;
}
interface PQFile {
  id: string; pq_course_id: string; uploaded_by_display: string; file_path: string; title: string; file_size: number; material_type: string; views: number; created_at: string | null;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024; const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
}

const PQ_MATERIAL_TYPES = [
  { value: "exam", label: "Exam" },
  { value: "test", label: "Test" },
  { value: "assignment", label: "Assignment" },
];

export default function AdminPastQuestions() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [courses, setCourses] = useState<PQCourse[]>([]);
  const [files, setFiles] = useState<PQFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("courses");
  const [levelFilter, setLevelFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");

  // Course dialog
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<PQCourse | null>(null);
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseLevel, setCourseLevel] = useState("100");
  const [courseSemester, setCourseSemester] = useState("first");
  const [courseColor, setCourseColor] = useState("");
  const [saving, setSaving] = useState(false);

  // Upload dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadCourseId, setUploadCourseId] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadMaterialType, setUploadMaterialType] = useState("exam");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ type: "course" | "file"; id: string; name: string } | null>(null);

  useEffect(() => { if (!adminLoading && !isAdmin) { toast.error("Access denied."); navigate("/admin"); } }, [isAdmin, adminLoading]);
  useEffect(() => { if (isAdmin) { fetchCourses(); fetchFiles(); } }, [isAdmin]);

  const fetchCourses = async () => {
    const { data } = await supabase.from("pq_courses_with_counts" as any).select("*").order("level").order("code");
    setCourses((data || []) as unknown as PQCourse[]);
    setLoading(false);
  };

  const fetchFiles = async () => {
    const { data } = await supabase.from("past_questions" as any).select("*").order("created_at", { ascending: false });
    setFiles((data || []) as unknown as PQFile[]);
  };

  const openAddCourse = () => {
    setEditingCourse(null); setCourseCode(""); setCourseName(""); setCourseLevel("100"); setCourseSemester("first"); setCourseColor("");
    setCourseDialogOpen(true);
  };

  const openEditCourse = (c: PQCourse) => {
    setEditingCourse(c); setCourseCode(c.code); setCourseName(c.name); setCourseLevel(String(c.level)); setCourseSemester(c.semester); setCourseColor(c.color || "");
    setCourseDialogOpen(true);
  };

  const handleSaveCourse = async () => {
    if (!courseCode.trim() || !courseName.trim()) { toast.error("Code and name are required"); return; }
    setSaving(true);
    try {
      const payload = { code: courseCode.trim().toUpperCase(), name: courseName.trim(), level: parseInt(courseLevel), semester: courseSemester, color: courseColor || null };
      if (editingCourse) {
        const { error } = await supabase.from("pq_courses" as any).update(payload).eq("id", editingCourse.id);
        if (error) throw error;
        toast.success("Course updated");
      } else {
        const { error } = await supabase.from("pq_courses" as any).insert(payload);
        if (error) throw error;
        toast.success("Course added");
      }
      setCourseDialogOpen(false); fetchCourses();
    } catch (err: any) { toast.error(err.message || "Failed"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "course") {
        const { error } = await supabase.from("pq_courses" as any).delete().eq("id", deleteTarget.id);
        if (error) throw error;
        toast.success("Course deleted"); fetchCourses(); fetchFiles();
      } else {
        const { error } = await supabase.from("past_questions" as any).delete().eq("id", deleteTarget.id);
        if (error) throw error;
        toast.success("File deleted"); fetchFiles();
      }
    } catch (err: any) { toast.error(err.message || "Failed"); }
    setDeleteTarget(null);
  };

  const openUploadDialog = () => {
    setUploadCourseId(courses.length > 0 ? courses[0].id : "");
    setUploadTitle("");
    setUploadMaterialType("exam");
    setUploadFile(null);
    setUploadDialogOpen(true);
  };

  const handleUploadFile = async () => {
    if (!uploadFile) { toast.error("Please select a file"); return; }
    if (!uploadCourseId) { toast.error("Please select a course"); return; }
    if (!uploadTitle.trim()) { toast.error("Please enter a title"); return; }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, nickname")
        .eq("id", user.id)
        .single();

      const displayName = profile?.display_name || profile?.nickname || "Admin";

      const filePath = `past_questions/${Date.now()}_${uploadFile.name}`;
      const { error: storageError } = await supabase.storage
        .from("school_pdfs")
        .upload(filePath, uploadFile);

      if (storageError) throw storageError;

      const selectedCourse = courses.find(c => c.id === uploadCourseId);

      const { error: insertError } = await supabase
        .from("past_questions")
        .insert({
          pq_course_id: uploadCourseId,
          uploaded_by: user.id,
          uploaded_by_display: displayName,
          file_path: filePath,
          title: uploadTitle.trim(),
          file_size: uploadFile.size,
          material_type: uploadMaterialType,
          level: selectedCourse?.level || 100,
        } as any);

      if (insertError) throw insertError;

      toast.success("File uploaded successfully");
      setUploadDialogOpen(false);
      fetchFiles();
      fetchCourses();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const filteredCourses = courses.filter(c => {
    if (levelFilter !== "all" && c.level !== parseInt(levelFilter)) return false;
    if (semesterFilter !== "all" && c.semester !== semesterFilter) return false;
    return true;
  });

  const getCourseName = (id: string) => courses.find(c => c.id === id)?.code || "—";

  if (adminLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!isAdmin) return null;

  return (
    <AdminShell
      title="Past Questions"
      subtitle="Manage courses and files"
      icon={<BookOpen className="h-5 w-5 text-primary" />}
    >
      <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList><TabsTrigger value="courses">Courses ({courses.length})</TabsTrigger><TabsTrigger value="files">Files ({files.length})</TabsTrigger></TabsList>

          <TabsContent value="courses" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="All Levels" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {[100,200,300,400,500].map(l => <SelectItem key={l} value={String(l)}>{l} Level</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Semesters" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  <SelectItem value="first">First Semester</SelectItem>
                  <SelectItem value="second">Second Semester</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openAddCourse} className="gap-2 ml-auto"><Plus className="w-4 h-4" /> Add Course</Button>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Level</TableHead><TableHead>Semester</TableHead><TableHead>Files</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredCourses.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No courses found</TableCell></TableRow>
                    ) : filteredCourses.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.code}</TableCell>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>{c.level}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{c.semester === "first" ? "1st" : "2nd"}</Badge></TableCell>
                        <TableCell>{c.question_count ?? 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditCourse(c)}><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget({ type: "course", id: c.id, name: c.code })}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={openUploadDialog} className="gap-2"><Upload className="w-4 h-4" /> Upload File</Button>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Title</TableHead><TableHead>Course</TableHead><TableHead>Uploader</TableHead><TableHead>Size</TableHead><TableHead>Views</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {files.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No files yet</TableCell></TableRow>
                    ) : files.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{f.title}</TableCell>
                        <TableCell>{getCourseName(f.pq_course_id)}</TableCell>
                        <TableCell className="text-muted-foreground">{f.uploaded_by_display}</TableCell>
                        <TableCell>{formatBytes(f.file_size)}</TableCell>
                        <TableCell>{f.views}</TableCell>
                        <TableCell>{f.created_at ? format(new Date(f.created_at), "MMM d, yyyy") : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget({ type: "file", id: f.id, name: f.title })}><Trash2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Course Add/Edit Dialog */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCourse ? "Edit Course" : "Add PQ Course"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Code *</Label><Input value={courseCode} onChange={e => setCourseCode(e.target.value.toUpperCase())} placeholder="GNS 101" /></div>
              <div className="space-y-1"><Label className="text-xs">Name *</Label><Input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Use of English" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Level</Label>
                <Select value={courseLevel} onValueChange={setCourseLevel}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[100,200,300,400,500].map(l => <SelectItem key={l} value={String(l)}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Semester</Label>
                <Select value={courseSemester} onValueChange={setCourseSemester}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="first">First</SelectItem><SelectItem value="second">Second</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Color</Label><Input value={courseColor} onChange={e => setCourseColor(e.target.value)} placeholder="#3b82f6" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCourse} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editingCourse ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload File Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Past Question File</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Course *</Label>
              <Select value={uploadCourseId} onValueChange={setUploadCourseId}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title *</Label>
              <Input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="e.g. GNS101 2023 Exam" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Material Type</Label>
              <Select value={uploadMaterialType} onValueChange={setUploadMaterialType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PQ_MATERIAL_TYPES.map(mt => <SelectItem key={mt.value} value={mt.value}>{mt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">File *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {uploadFile && (
                <p className="text-xs text-muted-foreground mt-1">{uploadFile.name} ({formatBytes(uploadFile.size)})</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUploadFile} disabled={uploading}>
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "course" ? "Course" : "File"}</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{deleteTarget?.name}"? {deleteTarget?.type === "course" && "All associated past question files will also be deleted."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
