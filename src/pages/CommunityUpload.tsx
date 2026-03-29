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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Upload, CheckCircle, AlertCircle,
  FileText, Loader2, X, GraduationCap, Building2, Layers,
  Calendar, BookOpen, File, Info, PlusCircle, ChevronDown
} from "lucide-react";
import { getDepartmentLevels } from "@/lib/departmentLevels";

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
  const [files, setFiles] = useState<File[]>([]);
  const [submittingIndex, setSubmittingIndex] = useState<number | null>(null);
  const [submittingFileName, setSubmittingFileName] = useState("");

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
      .eq("status", "approved" as any)
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

  const makeDisplayTitle = useCallback((inputFile: File) => {
    return inputFile.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " " );
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    const validFiles: File[] = [];
    let unsupportedCount = 0;

    for (const selected of selectedFiles) {
      if (!SUPPORTED_TYPES.includes(selected.type)) {
        unsupportedCount += 1;
        continue;
      }
      validFiles.push(selected);
    }

    if (unsupportedCount > 0) {
      toast.error(`${unsupportedCount} file${unsupportedCount > 1 ? "s were" : " was"} skipped because the format is not supported.`);
    }

    if (!validFiles.length) {
      e.target.value = "";
      return;
    }

    setFiles((prev) => {
      const seen = new Set(prev.map((item) => `${item.name}-${item.size}-${item.lastModified}`));
      const incoming = validFiles.filter((item) => {
        const key = `${item.name}-${item.size}-${item.lastModified}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return [...prev, ...incoming];
    });

    if (!title.trim() && validFiles.length === 1 && files.length === 0) {
      setTitle(makeDisplayTitle(validFiles[0]));
    }

    const convertibleCount = validFiles.filter((item) => item.type !== "application/pdf").length;
    if (convertibleCount > 0) {
      toast.info(`${convertibleCount} file${convertibleCount > 1 ? "s will" : " will"} be converted to PDF automatically during submission.`);
    }

    e.target.value = "";
  };

  const removeFileAtIndex = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const convertFileToPdfIfNeeded = async (inputFile: File): Promise<File> => {
    if (inputFile.type === "application/pdf") return inputFile;

    const formData = new FormData();
    formData.append("file", inputFile);

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/convert-to-pdf`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}` },
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Failed to convert ${inputFile.name} to PDF.`);
    }

    const result = await res.json();
    const pdfBytes = Uint8Array.from(atob(result.pdf), (c) => c.charCodeAt(0));
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    return new window.File([blob], result.convertedName || `${inputFile.name.replace(/\.[^.]+$/, "")}.pdf`, {
      type: "application/pdf",
    });
  };

  const getSubmissionTitle = (inputFile: File) => {
    const derivedTitle = makeDisplayTitle(inputFile);
    if (files.length === 1) {
      return title.trim() || derivedTitle;
    }
    return title.trim() ? `${title.trim()} - ${derivedTitle}` : derivedTitle;
  };

  const computeHash = async (f: File): Promise<string> => {
    const buffer = await f.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const submitFiles = async (skipDuplicateCheck = false) => {
    const effectiveCourseId = selectedCourseId || newCourseId;

    if (!files.length) { toast.error("Please select at least one file."); return; }
    if (!effectiveCourseId) { toast.error("Please select or create a course first."); return; }

    setSubmitting(true);
    setSubmittingIndex(null);
    setSubmittingFileName("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const utcMidnight = new Date();
      utcMidnight.setUTCHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("community_uploads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", utcMidnight.toISOString());

      if ((count || 0) + files.length > DAILY_UPLOAD_LIMIT) {
        toast.error(`You can upload ${DAILY_UPLOAD_LIMIT - (count || 0)} more file(s) today. Batch is too large for the daily limit.`);
        setSubmitting(false);
        return;
      }

      if (!skipDuplicateCheck) {
        const duplicatesFound: any[] = [];

        for (const inputFile of files) {
          const preparedFile = await convertFileToPdfIfNeeded(inputFile);
          const hash = await computeHash(preparedFile);
          const { data: dupes } = await supabase.rpc("check_duplicate_upload", {
            p_file_hash: hash,
            p_file_name: inputFile.name,
            p_file_size: inputFile.size,
            p_course_id: effectiveCourseId,
          });

          if (dupes && dupes.length > 0) {
            duplicatesFound.push({
              fileName: inputFile.name,
              matches: dupes,
            });
          }
        }

        if (duplicatesFound.length > 0) {
          setDuplicateWarning(duplicatesFound);
          setShowDuplicateDialog(true);
          setSubmitting(false);
          return;
        }
      }

      let successCount = 0;

      for (let index = 0; index < files.length; index += 1) {
        const inputFile = files[index];
        setSubmittingIndex(index);
        setSubmittingFileName(inputFile.name);

        const uploadFile = await convertFileToPdfIfNeeded(inputFile);
        const hash = await computeHash(uploadFile);
        const filePath = `community/${user.id}/${Date.now()}_${index}_${uploadFile.name}`;

        const { error: storageError } = await supabase.storage
          .from("school_pdfs")
          .upload(filePath, uploadFile);

        if (storageError) {
          const isNetworkError = storageError.message?.includes("network") ||
            storageError.message?.includes("fetch") ||
            storageError.message?.includes("timeout") ||
            storageError.message?.includes("Failed to fetch");
          throw new Error(isNetworkError
            ? `Upload failed for ${inputFile.name} — check your internet connection and try again.`
            : storageError.message
          );
        }

        const { error: insertError } = await supabase
          .from("community_uploads")
          .insert({
            user_id: user.id,
            faculty_id: selectedFacultyId,
            department_id: selectedDepartmentId,
            course_id: effectiveCourseId,
            level: selectedLevel,
            semester: selectedSemester,
            title: getSubmissionTitle(inputFile),
            description: description.trim() || null,
            material_type: materialType,
            file_path: filePath,
            original_file_name: inputFile.name,
            file_size: inputFile.size,
            file_hash: hash,
            status: "pending",
          });

        if (insertError) throw insertError;

        await supabase.rpc("increment_pending_count" as any, { p_user_id: user.id });
        successCount += 1;
      }

      setSubmitted(true);
      toast.success(successCount === 1 ? "Material submitted for review!" : `${successCount} materials submitted for review!`);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to submit materials");
    } finally {
      setSubmitting(false);
      setSubmittingIndex(null);
      setSubmittingFileName("");
    }
  };

  const handleSubmit = async () => {
    await submitFiles(false);
  };

  const handleForceSubmit = async () => {
    setShowDuplicateDialog(false);
    setDuplicateWarning([]);
    await submitFiles(true);
  };

  // Selected names for review
  const selectedFacultyName = faculties.find(f => f.id === selectedFacultyId)?.name || "";
  const selectedDepartmentName = departments.find(d => d.id === selectedDepartmentId)?.name || "";
  const availableLevels = getDepartmentLevels(selectedDepartmentName);
  const LEVELS = availableLevels.map((level) => ({ value: level, label: `${level} Level` }));
  const selectedCourseName = courses.find(c => c.id === selectedCourseId);
  const selectedLevelLabel = LEVELS.find(l => l.value === selectedLevel)?.label || "";

  useEffect(() => {
    if (selectedLevel && !availableLevels.includes(selectedLevel)) {
      setSelectedLevel(0);
    }
  }, [selectedLevel, availableLevels]);
  const selectedSemesterLabel = SEMESTERS.find(s => s.value === selectedSemester)?.label || "";

  const canProceed = (): boolean => {
    switch (currentStep) {
      case "faculty": return !!selectedFacultyId;
      case "department": return !!selectedDepartmentId;
      case "level": return selectedLevel > 0;
      case "semester": return !!selectedSemester;
      case "course": return !!(selectedCourseId || newCourseId);
      case "file": return files.length > 0;
      case "metadata": return true;
      case "review": return true;
      default: return false;
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Material Submitted" showBack backTo="/dashboard" />

        <div className="mx-auto w-full max-w-lg px-4 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.28 }}
            className="space-y-4"
          >
            <div className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm">
              <div className="bg-primary/[0.06] px-5 pt-8 pb-6 sm:px-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/12 ring-8 ring-primary/5">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>

                <div className="mt-5 text-center">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
                    Submission Complete
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold leading-tight text-foreground sm:text-[1.75rem]">
                    Batch submitted for review
                  </h2>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground sm:text-[15px]">
                    Your upload batch has been submitted successfully. Each file will appear on the platform once it is reviewed and approved by the course rep or admin.
                  </p>
                </div>
              </div>

              <CardContent className="space-y-4 px-5 py-5 sm:px-6">
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-muted/20 p-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">What happens next?</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Each file in your batch will be checked before it becomes visible to other students.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-muted/20 p-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Need to send another batch?</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        You can submit more materials right away without leaving this flow.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] px-4 py-3">
                  <p className="text-sm leading-6 text-muted-foreground">
                    Tip: clearer file names and course-specific titles make approval faster and help students find your materials more easily.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                  <Button
                    className="h-11 w-full rounded-xl"
                    onClick={() => {
                      setSubmitted(false);
                      setCurrentStep("faculty");
                      setSelectedFacultyId("");
                      setSelectedDepartmentId("");
                      setSelectedLevel(0);
                      setSelectedSemester("");
                      setSelectedCourseId("");
                      setFiles([]);
                      setTitle("");
                      setDescription("");
                      setMaterialType("lecture_note");
                    }}
                  >
                    Upload Another Batch
                  </Button>

                  
