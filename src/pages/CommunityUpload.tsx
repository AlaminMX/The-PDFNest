import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { GuestAuthPrompt } from "@/components/GuestAuthPrompt";
import { supabase } from "@/integrations/supabase/client";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Upload, CheckCircle, AlertCircle,
  FileText, Loader2, X, GraduationCap, Building2, Layers,
  Calendar, BookOpen, File, Info, PlusCircle, ChevronDown
} from "lucide-react";

const LEVELS = [
  { value: 100, label: "100 Level" },
  { value: 200, label: "200 Level" },
  { value: 300, label: "300 Level" },
  { value: 400, label: "400 Level" },
  { value: 500, label: "500 Level" },
];

const SEMESTERS = [
  { value: "first", label: "First Semester" },
  { value: "second", label: "Second Semester" },
];

const MATERIAL_TYPES = [
  { value: "lecture_note", label: "Lecture Note" },
  { value: "past_question", label: "Past Question" },
  { value: "assignment", label: "Assignment" },
  { value: "summary", label: "Summary" },
  { value: "other", label: "Other" },
];

const SUPPORTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const DAILY_UPLOAD_LIMIT = 10;

interface Faculty { id: string; name: string; slug: string; }
interface Department { id: string; name: string; slug: string; faculty_id: string | null; }
interface Course { id: string; code: string; name: string; }

type Step = "faculty" | "department" | "level" | "semester" | "course" | "file" | "metadata" | "review";

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: "faculty", label: "Faculty", icon: Building2 },
  { key: "department", label: "Department", icon: GraduationCap },
  { key: "level", label: "Level", icon: Layers },
  { key: "semester", label: "Semester", icon: Calendar },
  { key: "course", label: "Course", icon: BookOpen },
  { key: "file", label: "Upload", icon: Upload },
  { key: "metadata", label: "Details", icon: FileText },
  { key: "review", label: "Review", icon: CheckCircle },
];

function CommunityUploadContent() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>("faculty");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Selection state
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  // New course creation state
  const [creatingNewCourse, setCreatingNewCourse] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCredits, setNewCourseCredits] = useState("3");
  const [newCourseId, setNewCourseId] = useState(""); // id of a just-created pending course
  const [newCourseLabel, setNewCourseLabel] = useState(""); // display label for review step

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [convertedFile, setConvertedFile] = useState<File | null>(null);
  const [showConversionDialog, setShowConversionDialog] = useState(false);
  const [converting, setConverting] = useState(false);

  // Metadata state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materialType, setMaterialType] = useState("lecture_note");

  // Duplicate state
  const [duplicateWarning, setDuplicateWarning] = useState<any[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  // Data
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch faculties on mount
  useEffect(() => {
    supabase
      .from("faculties")
      .select("id, name, slug")
      .eq("is_visible", true)
      .order("display_order")
      .then(({ data }) => setFaculties((data as Faculty[]) || []));
  }, []);

  // Fetch departments when faculty changes
  useEffect(() => {
    if (!selectedFacultyId) { setDepartments([]); return; }
    setLoading(true);
    supabase
      .from("departments")
      .select("id, name, slug, faculty_id")
      .eq("faculty_id", selectedFacultyId)
      .eq("is_visible", true)
      .order("name")
      .then(({ data }) => {
        setDepartments((data as Department[]) || []);
        setLoading(false);
      });
  }, [selectedFacultyId]);

  // Fetch courses when department + level + semester selected
  useEffect(() => {
    if (!selectedDepartmentId || !selectedLevel || !selectedSemester) { setCourses([]); return; }
    setLoading(true);
    supabase
      .from("courses")
      .select("id, code, name")
      .eq("department_id", selectedDepartmentId)
      .eq("level", selectedLevel)
      .eq("semester", selectedSemester)
      .order("code")
      .then(({ data }) => {
        setCourses((data as Course[]) || []);
        setLoading(false);
      });
  }, [selectedDepartmentId, selectedLevel, selectedSemester]);

  const stepIndex = STEPS.findIndex(s => s.key === currentStep);

  const goNext = () => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) setCurrentStep(STEPS[nextIdx].key);
  };
  const goBack = () => {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) setCurrentStep(STEPS[prevIdx].key);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!SUPPORTED_TYPES.includes(selected.type)) {
      toast.error("Unsupported file type. Please upload PDF, DOC, DOCX, PPT, PPTX, or image files.");
      return;
    }
    if (selected.type !== "application/pdf") {
      setFile(selected);
      setShowConversionDialog(true);
    } else {
      setFile(selected);
      setConvertedFile(null);
    }

    // Auto-set title from filename
    if (!title) {
      const nameWithout = selected.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      setTitle(nameWithout);
    }

    e.target.value = "";
  };

  const handleConvert = async () => {
    if (!file) return;
    setConverting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/convert-to-pdf`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData,
        }
      );
      if (!res.ok) throw new Error("Conversion failed");
      const result = await res.json();
      const pdfBytes = Uint8Array.from(atob(result.pdf), c => c.charCodeAt(0));
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const converted = new window.File([blob], result.convertedName || "converted.pdf", { type: "application/pdf" });
      setConvertedFile(converted);
      setShowConversionDialog(false);
      toast.success("File converted to PDF successfully!");
    } catch (err) {
      toast.error("Failed to convert file. Please upload a PDF instead.");
      setFile(null);
    } finally {
      setConverting(false);
      setShowConversionDialog(false);
    }
  };

  const computeHash = async (f: File): Promise<string> => {
    const buffer = await f.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleSubmit = async () => {
    const uploadFile = convertedFile || file;
    const effectiveCourseId = selectedCourseId || newCourseId;
    if (!uploadFile || !effectiveCourseId || !title.trim()) {
      toast.error("Please complete all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check daily limit — use UTC midnight to match the DB trigger
      const utcMidnight = new Date();
      utcMidnight.setUTCHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("community_uploads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", utcMidnight.toISOString());

      if ((count || 0) >= DAILY_UPLOAD_LIMIT) {
        toast.error(`Daily upload limit reached (${DAILY_UPLOAD_LIMIT}). Please try again tomorrow.`);
        setSubmitting(false);
        return;
      }

      // Compute hash and check duplicates
      const hash = await computeHash(uploadFile);
      const { data: dupes } = await supabase.rpc("check_duplicate_upload", {
        p_file_hash: hash,
        p_file_name: file!.name,
        p_file_size: file!.size,
        p_course_id: effectiveCourseId,
      });

      if (dupes && dupes.length > 0 && !showDuplicateDialog) {
        setDuplicateWarning(dupes);
        setShowDuplicateDialog(true);
        setSubmitting(false);
        return;
      }

      // Upload file to storage
      const filePath = `community/${user.id}/${Date.now()}_${uploadFile.name}`;
      const { error: storageError } = await supabase.storage
        .from("school_pdfs")
        .upload(filePath, uploadFile);

      if (storageError) throw storageError;

      // Insert community_uploads record
      const { error: insertError } = await supabase
        .from("community_uploads")
        .insert({
          user_id: user.id,
          faculty_id: selectedFacultyId,
          department_id: selectedDepartmentId,
          course_id: effectiveCourseId,
          level: selectedLevel,
          semester: selectedSemester,
          title: title.trim(),
          description: description.trim() || null,
          material_type: materialType,
          file_path: filePath,
          original_file_name: file!.name,
          file_size: file!.size,
          file_hash: hash,
          status: "pending",
        });

      if (insertError) throw insertError;

      // Increment pending_count via upsert (insert or add 1)
      await supabase.rpc("increment_pending_count" as any, { p_user_id: user.id });

      setSubmitted(true);
      toast.success("Material submitted for review!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to submit material");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForceSubmit = () => {
    setShowDuplicateDialog(false);
    setDuplicateWarning([]);
    // Re-trigger submit which will skip duplicate check this time
    handleSubmitForce();
  };

  const handleSubmitForce = async () => {
    const uploadFile = convertedFile || file;
    if (!uploadFile || !selectedCourseId || !title.trim()) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Daily limit also applies on force-submit (duplicate bypass)
      const utcMidnightForce = new Date();
      utcMidnightForce.setUTCHours(0, 0, 0, 0);
      const { count: forceCount } = await supabase
        .from("community_uploads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", utcMidnightForce.toISOString());
      if ((forceCount || 0) >= DAILY_UPLOAD_LIMIT) {
        toast.error(`Daily upload limit reached (${DAILY_UPLOAD_LIMIT}). Please try again tomorrow.`);
        setSubmitting(false);
        return;
      }

      const hash = await computeHash(uploadFile);
      const filePath = `community/${user.id}/${Date.now()}_${uploadFile.name}`;
      const { error: storageError } = await supabase.storage
        .from("school_pdfs")
        .upload(filePath, uploadFile);
      if (storageError) throw storageError;

      const { error: insertError } = await supabase
        .from("community_uploads")
        .insert({
          user_id: user.id,
          faculty_id: selectedFacultyId,
          department_id: selectedDepartmentId,
          course_id: effectiveCourseId,
          level: selectedLevel,
          semester: selectedSemester,
          title: title.trim(),
          description: description.trim() || null,
          material_type: materialType,
          file_path: filePath,
          original_file_name: file!.name,
          file_size: file!.size,
          file_hash: hash,
          status: "pending",
        });
      if (insertError) throw insertError;

      // Increment pending_count (same as main submit path)
      await supabase.rpc("increment_pending_count" as any, { p_user_id: user.id });

      setSubmitted(true);
      toast.success("Material submitted for review!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit material");
    } finally {
      setSubmitting(false);
    }
  };

  // Selected names for review
  const selectedFacultyName = faculties.find(f => f.id === selectedFacultyId)?.name || "";
  const selectedDepartmentName = departments.find(d => d.id === selectedDepartmentId)?.name || "";
  const selectedCourseName = courses.find(c => c.id === selectedCourseId);
  const selectedLevelLabel = LEVELS.find(l => l.value === selectedLevel)?.label || "";
  const selectedSemesterLabel = SEMESTERS.find(s => s.value === selectedSemester)?.label || "";

  const canProceed = (): boolean => {
    switch (currentStep) {
      case "faculty": return !!selectedFacultyId;
      case "department": return !!selectedDepartmentId;
      case "level": return selectedLevel > 0;
      case "semester": return !!selectedSemester;
      case "course": return !!selectedCourseId || !!newCourseId;
      case "file": return !!file;
      case "metadata": return !!title.trim();
      case "review": return true;
      default: return false;
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="Material Submitted" showBack backTo="/dashboard" />
        <div className="max-w-lg mx-auto px-4 pt-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Submitted for Review</h2>
              <p className="text-muted-foreground text-sm">
                Your material has been submitted for review. It will appear once approved by the course rep or admin.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => {
                setSubmitted(false);
                setCurrentStep("faculty");
                setSelectedFacultyId("");
                setSelectedDepartmentId("");
                setSelectedLevel(0);
                setSelectedSemester("");
                setSelectedCourseId("");
                setFile(null);
                setConvertedFile(null);
                setTitle("");
                setDescription("");
                setMaterialType("lecture_note");
              }}>
                Upload Another
              </Button>
              <Button variant="outline" onClick={() => navigate("/profile")}>
                View My Submissions
              </Button>
              <Button onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          </motion.div>
        </div>
        <SmartBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Contribute Material" showBack />

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Step progress */}
        <div className="flex items-center gap-1">
          {STEPS.map((step, idx) => (
            <div key={step.key} className="flex items-center flex-1">
              <div
                className={`h-1.5 w-full rounded-full transition-colors ${
                  idx <= stepIndex ? "bg-primary" : "bg-muted"
                }`}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex].label}
        </p>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === "faculty" && (
              <StepCard title="Select Faculty" icon={Building2} description="Choose the faculty this material belongs to">
                <div className="space-y-2">
                  {faculties.map(f => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setSelectedFacultyId(f.id);
                        setSelectedDepartmentId("");
                        setSelectedCourseId("");
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedFacultyId === f.id
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                    >
                      <span className="font-medium text-sm">{f.name}</span>
                    </button>
                  ))}
                  {faculties.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">No faculties available</p>
                  )}
                </div>
              </StepCard>
            )}

            {currentStep === "department" && (
              <StepCard title="Select Department" icon={GraduationCap} description={`Departments under ${selectedFacultyName}`}>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="space-y-2">
                    {departments.map(d => (
                      <button
                        key={d.id}
                        onClick={() => {
                          setSelectedDepartmentId(d.id);
                          setSelectedCourseId("");
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedDepartmentId === d.id
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border hover:border-primary/50 text-foreground"
                        }`}
                      >
                        <span className="font-medium text-sm">{d.name}</span>
                      </button>
                    ))}
                    {departments.length === 0 && (
                      <p className="text-muted-foreground text-sm text-center py-4">No departments found for this faculty</p>
                    )}
                  </div>
                )}
              </StepCard>
            )}

            {currentStep === "level" && (
              <StepCard title="Select Level" icon={Layers} description="What level is this material for?">
                <div className="grid grid-cols-2 gap-2">
                  {LEVELS.map(l => (
                    <button
                      key={l.value}
                      onClick={() => {
                        setSelectedLevel(l.value);
                        setSelectedCourseId("");
                      }}
                      className={`p-3 rounded-lg border transition-colors text-center ${
                        selectedLevel === l.value
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                    >
                      <span className="font-medium text-sm">{l.label}</span>
                    </button>
                  ))}
                </div>
              </StepCard>
            )}

            {currentStep === "semester" && (
              <StepCard title="Select Semester" icon={Calendar} description="Which semester?">
                <div className="grid grid-cols-2 gap-3">
                  {SEMESTERS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => {
                        setSelectedSemester(s.value);
                        setSelectedCourseId("");
                      }}
                      className={`p-4 rounded-lg border transition-colors text-center ${
                        selectedSemester === s.value
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                    >
                      <span className="font-medium text-sm">{s.label}</span>
                    </button>
                  ))}
                </div>
              </StepCard>
            )}

            {currentStep === "course" && (
              <StepCard title="Select Course" icon={BookOpen} description={`Courses for ${selectedLevelLabel}, ${selectedSemesterLabel}`}>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="space-y-3">
                    {/* Existing courses */}
                    {courses.length > 0 && (
                      <div className="space-y-2">
                        {courses.map(c => (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedCourseId(c.id); setNewCourseId(""); setCreatingNewCourse(false); }}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              selectedCourseId === c.id
                                ? "border-primary bg-primary/5 text-foreground"
                                : "border-border hover:border-primary/50 text-foreground"
                            }`}
                          >
                            <span className="font-semibold text-sm">{c.code}</span>
                            <span className="text-muted-foreground text-sm ml-2">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {courses.length === 0 && !creatingNewCourse && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          No courses found for this level and semester yet. Create your course below to continue uploading.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Divider */}
                    {courses.length > 0 && (
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">or</span>
                        </div>
                      </div>
                    )}

                    {/* Create new course toggle */}
                    {!creatingNewCourse ? (
                      <button
                        type="button"
                        onClick={() => { setCreatingNewCourse(true); setSelectedCourseId(""); setNewCourseId(""); }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-border hover:border-primary/50 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <PlusCircle className="w-4 h-4" />
                        {courses.length > 0 ? "My course isn't listed — create it" : "Create new course"}
                      </button>
                    ) : (
                      <div className="rounded-xl border border-primary/20 bg-primary/[0.02] p-4 space-y-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">Create new course</p>
                          <p className="text-xs text-muted-foreground">
                            Format: <span className="font-mono bg-muted px-1 rounded">MEE401 Thermodynamics II</span>
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Course Code *</Label>
                            <Input
                              value={newCourseCode}
                              onChange={(e) => setNewCourseCode(e.target.value.toUpperCase())}
                              placeholder="e.g. MEE401"
                              className="h-9 text-sm font-mono"
                              maxLength={10}
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Course Name *</Label>
                            <Input
                              value={newCourseName}
                              onChange={(e) => setNewCourseName(e.target.value)}
                              placeholder="e.g. Thermodynamics II"
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>

                        <div className="w-32 space-y-1">
                          <Label className="text-xs">Credit Units</Label>
                          <Input
                            type="number" min={1} max={10}
                            value={newCourseCredits}
                            onChange={(e) => setNewCourseCredits(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>

                        {newCourseId && (
                          <Alert className="border-green-500/30 bg-green-500/5">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-sm text-green-700 dark:text-green-400">
                              Course saved as pending — you can now proceed. Admins will review it.
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 h-9 gap-1.5"
                            disabled={!newCourseCode.trim() || !newCourseName.trim() || !!newCourseId}
                            onClick={async () => {
                              const code = newCourseCode.trim().toUpperCase();
                              const name = newCourseName.trim();
                              if (!code || !name) { toast.error("Code and name are required"); return; }

                              // Check for exact duplicate in this dept/level/semester
                              const { data: existing } = await supabase
                                .from("courses")
                                .select("id, code, name")
                                .eq("department_id", selectedDepartmentId)
                                .eq("level", selectedLevel)
                                .eq("semester", selectedSemester)
                                .ilike("code", code);

                              if (existing && existing.length > 0) {
                                // Use the existing course instead
                                setSelectedCourseId(existing[0].id);
                                setNewCourseId("");
                                setCreatingNewCourse(false);
                                toast.info(`Course ${existing[0].code} already exists — selected for you.`);
                                return;
                              }

                              const { data: { user } } = await supabase.auth.getUser();
                              const { data: inserted, error } = await supabase
                                .from("courses")
                                .insert({
                                  department_id: selectedDepartmentId,
                                  code,
                                  name,
                                  level: selectedLevel,
                                  semester: selectedSemester,
                                  credit_units: parseInt(newCourseCredits) || 3,
                                  status: "pending",
                                  suggested_by: user?.id,
                                } as any)
                                .select("id")
                                .single();

                              if (error) { toast.error("Failed to create course"); return; }
                              setNewCourseId(inserted.id);
                              setNewCourseLabel(`${code} — ${name} (pending)`);
                              toast.success("Course created as pending — proceed to upload.");
                            }}
                          >
                            {newCourseId ? <CheckCircle className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
                            {newCourseId ? "Saved" : "Save Course"}
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-9"
                            onClick={() => { setCreatingNewCourse(false); setNewCourseCode(""); setNewCourseName(""); setNewCourseId(""); setNewCourseLabel(""); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </StepCard>
            )}

            {currentStep === "file" && (
              <StepCard title="Upload File" icon={Upload} description="Select your study material">
                <div className="space-y-4">
                  {file ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                      <File className="w-8 h-8 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                          {convertedFile && " • Converted to PDF ✓"}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => { setFile(null); setConvertedFile(null); }}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label
                      htmlFor="community-file-upload"
                      className="flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-muted/20"
                    >
                      <Upload className="w-10 h-10 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">Tap to select a file</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, PPT, PPTX, or images</p>
                      </div>
                    </label>
                  )}
                  <input
                    id="community-file-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {!file && (
                    <Button variant="outline" className="w-full" onClick={() => document.getElementById("community-file-upload")?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> Choose File
                    </Button>
                  )}
                </div>
              </StepCard>
            )}

            {currentStep === "metadata" && (
              <StepCard title="Material Details" icon={FileText} description="Add information about this material">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Chapter 3 - Thermodynamics"
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Brief description of the material..."
                      rows={3}
                      maxLength={500}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Material Type</Label>
                    <Select value={materialType} onValueChange={setMaterialType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MATERIAL_TYPES.map(mt => (
                          <SelectItem key={mt.value} value={mt.value}>{mt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </StepCard>
            )}

            {currentStep === "review" && (
              <StepCard title="Review & Submit" icon={CheckCircle} description="Verify your submission details">
                <div className="space-y-3">
                  <ReviewRow label="Faculty" value={selectedFacultyName} />
                  <ReviewRow label="Department" value={selectedDepartmentName} />
                  <ReviewRow label="Level" value={selectedLevelLabel} />
                  <ReviewRow label="Semester" value={selectedSemesterLabel} />
                  <ReviewRow label="Course" value={selectedCourseName ? `${selectedCourseName.code} - ${selectedCourseName.name}` : newCourseLabel || ""} />
                  <ReviewRow label="File" value={file?.name || ""} />
                  <ReviewRow label="Title" value={title} />
                  {description && <ReviewRow label="Description" value={description} />}
                  <ReviewRow label="Type" value={MATERIAL_TYPES.find(m => m.value === materialType)?.label || ""} />

                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Your submission will be reviewed before it becomes publicly available. You'll be notified when it's approved.
                    </AlertDescription>
                  </Alert>
                </div>
              </StepCard>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-2">
          {stepIndex > 0 && (
            <Button variant="outline" onClick={goBack} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          )}
          {currentStep === "review" ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {submitting ? "Submitting..." : "Submit for Review"}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canProceed()}
              className="flex-1"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Conversion dialog */}
      <Dialog open={showConversionDialog} onOpenChange={setShowConversionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to PDF?</DialogTitle>
            <DialogDescription>
              This file ({file?.name}) is not a PDF. Would you like to convert it to PDF for consistent viewing?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowConversionDialog(false); setFile(null); }}>
              Cancel
            </Button>
            <Button onClick={handleConvert} disabled={converting}>
              {converting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {converting ? "Converting..." : "Convert to PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate warning dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" /> Possible Duplicate
            </DialogTitle>
            <DialogDescription>
              Similar materials already exist for this course:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {duplicateWarning.map((d: any) => (
              <div key={d.id} className="text-sm p-2 rounded bg-muted/50 border border-border">
                <p className="font-medium text-foreground">{d.title}</p>
                <p className="text-xs text-muted-foreground">Status: {d.status}</p>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowDuplicateDialog(false); setDuplicateWarning([]); }}>
              Cancel
            </Button>
            <Button onClick={handleForceSubmit}>
              Upload Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SmartBottomNav />
    </div>
  );
}

function StepCard({ title, icon: Icon, description, children }: {
  title: string;
  icon: React.ElementType;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

export default function CommunityUpload() {
  const navigate = useNavigate();
  const [guestOpen, setGuestOpen] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  // Use supabase directly to check auth without importing useAuth hook again
  useEffect(() => {
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsAuthed(true);
        } else {
          setGuestOpen(true);
        }
        setCheckedAuth(true);
      });
    });
  }, []);

  if (!checkedAuth) return null;

  return (
    <>
      <GuestAuthPrompt
        open={guestOpen}
        action="upload materials"
        onClose={() => { setGuestOpen(false); navigate(-1); }}
      />
      {isAuthed && <CommunityUploadContent />}
    </>
  );
}
