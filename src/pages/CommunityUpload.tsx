import { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2,
  X,
  GraduationCap,
  Building2,
  Layers,
  Calendar,
  BookOpen,
  File,
  Info,
  PlusCircle,
  ChevronDown,
  ScrollText,
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

const PQ_MATERIAL_TYPES = [
  { value: "exam", label: "Exam" },
  { value: "test", label: "Test" },
  { value: "assignment", label: "Assignment" },
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

const PQ_LEVELS = [100, 200, 300, 400, 500].map((l) => ({
  value: l,
  label: `${l} Level`,
}));

interface Faculty {
  id: string;
  name: string;
  slug: string;
}
interface Department {
  id: string;
  name: string;
  slug: string;
  faculty_id: string | null;
}
interface Course {
  id: string;
  code: string;
  name: string;
}
interface PQCourseOption {
  id: string;
  code: string;
  name: string;
}

type Step =
  | "faculty"
  | "department"
  | "level"
  | "semester"
  | "course"
  | "file"
  | "metadata"
  | "review";

const ALL_STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
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

  // PQ mode
  const [isPastQuestions, setIsPastQuestions] = useState(false);

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
  const [newCourseId, setNewCourseId] = useState("");
  const [newCourseLabel, setNewCourseLabel] = useState("");

  // PQ course state
  const [pqCourses, setPqCourses] = useState<PQCourseOption[]>([]);
  const [selectedPqCourseId, setSelectedPqCourseId] = useState("");
  const [pqLoading, setPqLoading] = useState(false);

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
  const [facultiesLoading, setFacultiesLoading] = useState(true);
  const [checkingStudent, setCheckingStudent] = useState(true);
  const [canContribute, setCanContribute] = useState(true);

  // Dynamic steps based on PQ mode
  const STEPS = useMemo(() => {
    if (isPastQuestions) {
      return ALL_STEPS.filter((s) => s.key !== "department");
    }
    return ALL_STEPS;
  }, [isPastQuestions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCheckingStudent(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("is_student")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const allowed = data?.is_student !== false;
      setCanContribute(allowed);
      setCheckingStudent(false);
      if (!allowed) {
        toast.info("Only students can contribute materials.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch faculties on mount
  useEffect(() => {
    setFacultiesLoading(true);
    supabase
      .from("faculties")
      .select("id, name, slug")
      .eq("is_visible", true)
      .order("display_order")
      .then(({ data }) => {
        setFaculties((data as Faculty[]) || []);
        setFacultiesLoading(false);
      });
  }, []);

  // Fetch departments when faculty changes
  useEffect(() => {
    if (!selectedFacultyId || isPastQuestions) {
      setDepartments([]);
      return;
    }
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
  }, [selectedFacultyId, isPastQuestions]);

  // Fetch courses when department + level + semester selected (regular mode)
  useEffect(() => {
    if (isPastQuestions) return;
    if (!selectedDepartmentId || !selectedLevel || !selectedSemester) {
      setCourses([]);
      return;
    }
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
  }, [selectedDepartmentId, selectedLevel, selectedSemester, isPastQuestions]);

  // Fetch PQ courses when in PQ mode + level + semester selected
  useEffect(() => {
    if (!isPastQuestions || !selectedLevel || !selectedSemester) {
      setPqCourses([]);
      return;
    }
    setPqLoading(true);
    supabase
      .from("pq_courses")
      .select("id, code, name")
      .eq("level", selectedLevel)
      .eq("semester", selectedSemester)
      .order("code")
      .then(({ data }) => {
        setPqCourses((data as PQCourseOption[]) || []);
        setPqLoading(false);
      });
  }, [isPastQuestions, selectedLevel, selectedSemester]);

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const goNext = () => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) setCurrentStep(STEPS[nextIdx].key);
  };
  const goBack = () => {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) setCurrentStep(STEPS[prevIdx].key);
  };

  const makeDisplayTitle = useCallback((inputFile: File) => {
    return inputFile.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
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
      toast.error(
        `${unsupportedCount} file${unsupportedCount > 1 ? "s were" : " was"} skipped because the format is not supported.`,
      );
    }

    if (!validFiles.length) {
      e.target.value = "";
      return;
    }

    setFiles((prev) => {
      const seen = new Set(
        prev.map((item) => `${item.name}-${item.size}-${item.lastModified}`),
      );
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

    const convertibleCount = validFiles.filter(
      (item) => item.type !== "application/pdf",
    ).length;
    if (convertibleCount > 0) {
      toast.info(
        `${convertibleCount} file${convertibleCount > 1 ? "s will" : " will"} be converted to PDF automatically during submission.`,
      );
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

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/convert-to-pdf`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      },
    );

    if (!res.ok) {
      throw new Error(`Failed to convert ${inputFile.name} to PDF.`);
    }

    const result = await res.json();
    const pdfBytes = Uint8Array.from(atob(result.pdf), (c) => c.charCodeAt(0));
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    return new window.File(
      [blob],
      result.convertedName || `${inputFile.name.replace(/\.[^.]+$/, "")}.pdf`,
      {
        type: "application/pdf",
      },
    );
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
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const submitFiles = async (skipDuplicateCheck = false) => {
    const effectiveCourseId = isPastQuestions
      ? selectedPqCourseId
      : selectedCourseId || newCourseId;

    if (!files.length) {
      toast.error("Please select at least one file.");
      return;
    }
    if (!effectiveCourseId) {
      toast.error(
        isPastQuestions
          ? "Please select a PQ course."
          : "Please select or create a course first.",
      );
      return;
    }

    setSubmitting(true);
    setSubmittingIndex(null);
    setSubmittingFileName("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const utcMidnight = new Date();
      utcMidnight.setUTCHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("community_uploads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", utcMidnight.toISOString());

      if ((count || 0) + files.length > DAILY_UPLOAD_LIMIT) {
        toast.error(
          `You can upload ${DAILY_UPLOAD_LIMIT - (count || 0)} more file(s) today. Batch is too large for the daily limit.`,
        );
        setSubmitting(false);
        return;
      }

      // Skip duplicate check for PQ mode (no check_duplicate_upload for pq_course_id)
      if (!skipDuplicateCheck && !isPastQuestions) {
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
          const isNetworkError =
            storageError.message?.includes("network") ||
            storageError.message?.includes("fetch") ||
            storageError.message?.includes("timeout") ||
            storageError.message?.includes("Failed to fetch");
          throw new Error(
            isNetworkError
              ? `Upload failed for ${inputFile.name} — check your internet connection and try again.`
              : storageError.message,
          );
        }

        const insertPayload: any = {
          user_id: user.id,
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
        };

        if (isPastQuestions) {
          insertPayload.pq_course_id = selectedPqCourseId;
          insertPayload.faculty_id = null;
          insertPayload.department_id = null;
          insertPayload.course_id = null;
        } else {
          insertPayload.faculty_id = selectedFacultyId;
          insertPayload.department_id = selectedDepartmentId;
          insertPayload.course_id = effectiveCourseId;
        }

        const { error: insertError } = await supabase
          .from("community_uploads")
          .insert(insertPayload);

        if (insertError) throw insertError;

        await supabase.rpc("increment_pending_count" as any, {
          p_user_id: user.id,
        });
        successCount += 1;
      }

      setSubmitted(true);
      toast.success(
        successCount === 1
          ? "Material submitted for review!"
          : `${successCount} materials submitted for review!`,
      );
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
  const selectedFacultyName = isPastQuestions
    ? "Past Questions"
    : faculties.find((f) => f.id === selectedFacultyId)?.name || "";
  const selectedDepartmentName = isPastQuestions
    ? ""
    : departments.find((d) => d.id === selectedDepartmentId)?.name || "";
  const availableLevels = isPastQuestions
    ? [100, 200, 300, 400, 500]
    : getDepartmentLevels(selectedDepartmentName);
  const LEVELS = isPastQuestions
    ? PQ_LEVELS
    : availableLevels.map((level) => ({
        value: level,
        label: `${level} Level`,
      }));
  const selectedCourseName = isPastQuestions
    ? null
    : courses.find((c) => c.id === selectedCourseId);
  const selectedPqCourse = pqCourses.find((c) => c.id === selectedPqCourseId);
  const selectedLevelLabel =
    LEVELS.find((l) => l.value === selectedLevel)?.label || "";

  const activeMaterialTypes = isPastQuestions
    ? PQ_MATERIAL_TYPES
    : MATERIAL_TYPES;

  useEffect(() => {
    if (selectedLevel && !availableLevels.includes(selectedLevel as any)) {
      setSelectedLevel(0);
    }
  }, [selectedLevel, availableLevels]);

  // Reset material type when switching modes
  useEffect(() => {
    if (isPastQuestions) {
      setMaterialType("exam");
    } else {
      setMaterialType("lecture_note");
    }
  }, [isPastQuestions]);

  const selectedSemesterLabel =
    SEMESTERS.find((s) => s.value === selectedSemester)?.label || "";

  const canProceed = (): boolean => {
    switch (currentStep) {
      case "faculty":
        return isPastQuestions || !!selectedFacultyId;
      case "department":
        return !!selectedDepartmentId;
      case "level":
        return selectedLevel > 0;
      case "semester":
        return !!selectedSemester;
      case "course":
        return isPastQuestions
          ? !!selectedPqCourseId
          : !!(selectedCourseId || newCourseId);
      case "file":
        return files.length > 0;
      case "metadata":
        return true;
      case "review":
        return true;
      default:
        return false;
    }
  };

  const resetAll = () => {
    setSubmitted(false);
    setCurrentStep("faculty");
    setIsPastQuestions(false);
    setSelectedFacultyId("");
    setSelectedDepartmentId("");
    setSelectedLevel(0);
    setSelectedSemester("");
    setSelectedCourseId("");
    setSelectedPqCourseId("");
    setFiles([]);
    setTitle("");
    setDescription("");
    setMaterialType("lecture_note");
  };

  if (checkingStudent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canContribute) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Contribute Material" showBack backTo="/dashboard" />
        <div className="mx-auto max-w-md px-4 py-12 text-center">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <GraduationCap className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">Students only</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Only students can contribute materials.
            </p>
            <Button className="mt-5" onClick={() => navigate("/dashboard")}>
              Back to dashboard
            </Button>
          </div>
        </div>
        <SmartBottomNav />
      </div>
    );
  }

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
                    Your upload batch has been submitted successfully. Each file
                    will appear on the platform once it is reviewed and approved
                    by the course rep or admin.
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
                      <p className="text-sm font-medium text-foreground">
                        What happens next?
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Each file in your batch will be checked before it
                        becomes visible to other students.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-muted/20 p-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Need to send another batch?
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        You can submit more materials right away without leaving
                        this flow.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] px-4 py-3">
                  <p className="text-sm leading-6 text-muted-foreground">
                    Tip: clearer file names and course-specific titles make
                    approval faster and help students find your materials more
                    easily.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                  <Button className="h-11 w-full rounded-xl" onClick={resetAll}>
                    Upload Another Batch
                  </Button>

                  <Button
                    variant="outline"
                    className="h-11 w-full rounded-xl"
                    onClick={() => navigate("/profile")}
                  >
                    View My Submissions
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  className="h-11 w-full rounded-xl"
                  onClick={() => navigate("/dashboard")}
                >
                  Go to Dashboard
                </Button>
              </CardContent>
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
              <StepCard
                title="Select Category"
                icon={Building2}
                description="Choose the type of material you want to upload"
              >
                <div className="space-y-2">
                  {facultiesLoading ? (
                    <>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-12 rounded-lg bg-muted/30 animate-pulse"
                        />
                      ))}
                    </>
                  ) : (
                    <>
                      {faculties.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            setIsPastQuestions(false);
                            setSelectedFacultyId(f.id);
                            setSelectedDepartmentId("");
                            setSelectedCourseId("");
                            setSelectedPqCourseId("");
                          }}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            !isPastQuestions && selectedFacultyId === f.id
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border hover:border-primary/50 text-foreground"
                          }`}
                        >
                          <span className="font-medium text-sm">{f.name}</span>
                        </button>
                      ))}

                      {/* Past Questions special tile */}
                      <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            or
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setIsPastQuestions(true);
                          setSelectedFacultyId("");
                          setSelectedDepartmentId("");
                          setSelectedCourseId("");
                          setSelectedPqCourseId("");
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center gap-3 ${
                          isPastQuestions
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border hover:border-primary/50 text-foreground"
                        }`}
                      >
                        <ScrollText className="w-5 h-5 text-primary shrink-0" />
                        <div>
                          <span className="font-medium text-sm">
                            Past Questions
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Upload exam papers, tests, and assignments
                          </p>
                        </div>
                      </button>

                      {faculties.length === 0 && (
                        <p className="text-muted-foreground text-sm text-center py-4">
                          No faculties available
                        </p>
                      )}
                    </>
                  )}
                </div>
              </StepCard>
            )}

            {currentStep === "department" && !isPastQuestions && (
              <StepCard
                title="Select Department"
                icon={GraduationCap}
                description={`Departments under ${selectedFacultyName}`}
              >
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {departments.map((d) => (
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
                      <p className="text-muted-foreground text-sm text-center py-4">
                        No departments found for this faculty
                      </p>
                    )}
                  </div>
                )}
              </StepCard>
            )}

            {currentStep === "level" && (
              <StepCard
                title="Select Level"
                icon={Layers}
                description="What level is this material for?"
              >
                <div className="grid grid-cols-2 gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => {
                        setSelectedLevel(l.value);
                        setSelectedCourseId("");
                        setSelectedPqCourseId("");
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
              <StepCard
                title="Select Semester"
                icon={Calendar}
                description="Which semester?"
              >
                <div className="grid grid-cols-2 gap-3">
                  {SEMESTERS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => {
                        setSelectedSemester(s.value);
                        setSelectedCourseId("");
                        setSelectedPqCourseId("");
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

            {currentStep === "course" && isPastQuestions && (
              <StepCard
                title="Select PQ Course"
                icon={ScrollText}
                description={`Past question courses for ${selectedLevelLabel}, ${selectedSemesterLabel}`}
              >
                {pqLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pqCourses.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      No PQ courses found for this level and semester. Ask your
                      admin to add courses first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {pqCourses.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedPqCourseId(c.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedPqCourseId === c.id
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border hover:border-primary/50 text-foreground"
                        }`}
                      >
                        <span className="font-semibold text-sm">{c.code}</span>
                        <span className="text-muted-foreground text-sm ml-2">
                          {c.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </StepCard>
            )}

            {currentStep === "course" && !isPastQuestions && (
              <StepCard
                title="Select Course"
                icon={BookOpen}
                description={`Courses for ${selectedLevelLabel}, ${selectedSemesterLabel}`}
              >
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {courses.length > 0 && (
                      <div className="space-y-2">
                        {courses.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedCourseId(c.id);
                              setNewCourseId("");
                              setCreatingNewCourse(false);
                            }}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              selectedCourseId === c.id
                                ? "border-primary bg-primary/5 text-foreground"
                                : "border-border hover:border-primary/50 text-foreground"
                            }`}
                          >
                            <span className="font-semibold text-sm">
                              {c.code}
                            </span>
                            <span className="text-muted-foreground text-sm ml-2">
                              {c.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {courses.length === 0 &&
                      !creatingNewCourse &&
                      !newCourseId && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            No courses found for this level and semester yet.
                            Create your course below to continue uploading.
                          </AlertDescription>
                        </Alert>
                      )}

                    {newCourseId && !creatingNewCourse && (
                      <button
                        type="button"
                        onClick={() => {}}
                        className="w-full text-left p-3 rounded-lg border border-primary bg-primary/5 text-foreground cursor-default"
                      >
                        <span className="font-semibold text-sm">
                          {newCourseCode}
                        </span>
                        <span className="text-muted-foreground text-sm ml-2">
                          {newCourseName}
                        </span>
                        <span className="ml-2 text-[11px] text-yellow-600 dark:text-yellow-400 font-medium">
                          (pending review)
                        </span>
                      </button>
                    )}

                    {(courses.length > 0 || newCourseId) &&
                      !creatingNewCourse && (
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                              or
                            </span>
                          </div>
                        </div>
                      )}

                    {!creatingNewCourse ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCreatingNewCourse(true);
                          setSelectedCourseId("");
                          setNewCourseId("");
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-border hover:border-primary/50 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <PlusCircle className="w-4 h-4" />
                        {courses.length > 0
                          ? "My course isn't listed — create it"
                          : "Create new course"}
                      </button>
                    ) : (
                      <div className="rounded-xl border border-primary/20 bg-primary/[0.02] p-4 space-y-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">
                            Create new course
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Format:{" "}
                            <span className="font-mono bg-muted px-1 rounded">
                              MEE401 Thermodynamics II
                            </span>
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Course Code *</Label>
                            <Input
                              value={newCourseCode}
                              onChange={(e) =>
                                setNewCourseCode(e.target.value.toUpperCase())
                              }
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
                            type="number"
                            min={1}
                            max={10}
                            value={newCourseCredits}
                            onChange={(e) =>
                              setNewCourseCredits(e.target.value)
                            }
                            className="h-9 text-sm"
                          />
                        </div>

                        {newCourseId && (
                          <Alert className="border-green-500/30 bg-green-500/5">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-sm text-green-700 dark:text-green-400">
                              Course saved as pending — you can now proceed.
                              Admins will review it.
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 h-9 gap-1.5"
                            disabled={
                              !newCourseCode.trim() ||
                              !newCourseName.trim() ||
                              !!newCourseId
                            }
                            onClick={async () => {
                              const code = newCourseCode.trim().toUpperCase();
                              const name = newCourseName.trim();
                              if (!code || !name) {
                                toast.error("Code and name are required");
                                return;
                              }

                              const { data: existing } = await supabase
                                .from("courses")
                                .select("id, code, name")
                                .eq("department_id", selectedDepartmentId)
                                .eq("level", selectedLevel)
                                .eq("semester", selectedSemester)
                                .ilike("code", code);

                              if (existing && existing.length > 0) {
                                setSelectedCourseId(existing[0].id);
                                setNewCourseId("");
                                setCreatingNewCourse(false);
                                toast.info(
                                  `Course ${existing[0].code} already exists — selected for you.`,
                                );
                                return;
                              }

                              const {
                                data: { user },
                              } = await supabase.auth.getUser();
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

                              if (error) {
                                if (
                                  error.message?.includes(
                                    "row-level security",
                                  ) ||
                                  error.message?.includes("policy")
                                ) {
                                  toast.error(
                                    "Unable to create course — please run the latest database migration in your Supabase dashboard.",
                                  );
                                } else {
                                  toast.error(
                                    error.message || "Failed to create course",
                                  );
                                }
                                return;
                              }
                              setNewCourseId(inserted.id);
                              setNewCourseLabel(`${code} — ${name} (pending)`);
                              setCreatingNewCourse(false);
                              toast.success(
                                "Course saved — now select it above and continue.",
                              );
                            }}
                          >
                            {newCourseId ? (
                              <CheckCircle className="w-3.5 h-3.5" />
                            ) : (
                              <PlusCircle className="w-3.5 h-3.5" />
                            )}
                            {newCourseId ? "Saved" : "Save Course"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9"
                            onClick={async () => {
                              if (newCourseId) {
                                await supabase
                                  .from("courses")
                                  .delete()
                                  .eq("id", newCourseId)
                                  .eq("status", "pending" as any);
                              }
                              setCreatingNewCourse(false);
                              setNewCourseCode("");
                              setNewCourseName("");
                              setNewCourseId("");
                              setNewCourseLabel("");
                            }}
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
              <StepCard
                title="Upload Files"
                icon={Upload}
                description="Select one or more study materials at once"
              >
                <div className="space-y-4">
                  <label
                    htmlFor="community-file-upload"
                    className="flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-muted/20"
                  >
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        Tap to select one or more files
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, DOC, DOCX, PPT, PPTX, or images
                      </p>
                    </div>
                  </label>

                  <input
                    id="community-file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        document
                          .getElementById("community-file-upload")
                          ?.click()
                      }
                    >
                      <Upload className="w-4 h-4 mr-2" />{" "}
                      {files.length ? "Add More Files" : "Choose Files"}
                    </Button>
                    {files.length > 0 && (
                      <Button
                        variant="ghost"
                        className="shrink-0"
                        onClick={clearFiles}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>

                  {files.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
                        <p className="text-sm font-medium text-foreground">
                          {files.length} file{files.length > 1 ? "s" : ""}{" "}
                          selected
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(
                            files.reduce(
                              (total, item) => total + item.size,
                              0,
                            ) /
                            1024 /
                            1024
                          ).toFixed(2)}{" "}
                          MB total
                        </p>
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {files.map((item, index) => (
                          <div
                            key={`${item.name}-${item.size}-${item.lastModified}`}
                            className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30"
                          >
                            <File className="w-8 h-8 text-primary shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground break-words">
                                {item.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {(item.size / 1024 / 1024).toFixed(2)} MB
                                {item.type !== "application/pdf"
                                  ? " • Will convert to PDF"
                                  : " • PDF ready"}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFileAtIndex(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        You can upload multiple documents in one batch. Each
                        file will be submitted as its own material under the
                        same course, level, and semester.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </StepCard>
            )}

            {currentStep === "metadata" && (
              <StepCard
                title="Material Details"
                icon={FileText}
                description="Add information for this upload batch"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Batch Title Prefix (optional)</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={
                        isPastQuestions
                          ? "e.g. GNS101 2023 Exam"
                          : "e.g. MEE401 Lecture Notes"
                      }
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of the material..."
                      rows={3}
                      maxLength={500}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Material Type</Label>
                    <Select
                      value={materialType}
                      onValueChange={setMaterialType}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {activeMaterialTypes.map((mt) => (
                          <SelectItem key={mt.value} value={mt.value}>
                            {mt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </StepCard>
            )}

            {currentStep === "review" && (
              <StepCard
                title="Review & Submit"
                icon={CheckCircle}
                description="Verify your submission details"
              >
                <div className="space-y-3">
                  <ReviewRow
                    label={isPastQuestions ? "Category" : "Faculty"}
                    value={selectedFacultyName}
                  />
                  {!isPastQuestions && (
                    <ReviewRow
                      label="Department"
                      value={selectedDepartmentName}
                    />
                  )}
                  <ReviewRow label="Level" value={selectedLevelLabel} />
                  <ReviewRow label="Semester" value={selectedSemesterLabel} />
                  <ReviewRow
                    label="Course"
                    value={
                      isPastQuestions
                        ? selectedPqCourse
                          ? `${selectedPqCourse.code} - ${selectedPqCourse.name}`
                          : ""
                        : selectedCourseName
                          ? `${selectedCourseName.code} - ${selectedCourseName.name}`
                          : newCourseLabel || ""
                    }
                  />
                  <ReviewRow label="Files" value={`${files.length} selected`} />
                  <ReviewRow
                    label="Title Style"
                    value={title || "File names will be used"}
                  />

                  <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                    <p className="text-xs font-medium text-foreground">
                      Files in this batch
                    </p>
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {files.map((item) => (
                        <div
                          key={`${item.name}-${item.size}-${item.lastModified}`}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="text-foreground truncate">
                            {item.name}
                          </span>
                          <span className="text-muted-foreground shrink-0">
                            {(item.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {description && (
                    <ReviewRow label="Description" value={description} />
                  )}
                  <ReviewRow
                    label="Type"
                    value={
                      activeMaterialTypes.find((m) => m.value === materialType)
                        ?.label || ""
                    }
                  />

                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Your submission will be reviewed before it becomes
                      publicly available. You'll be notified when it's approved.
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
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {submitting
                ? submittingIndex !== null
                  ? `Uploading ${submittingIndex + 1}/${files.length}`
                  : "Submitting..."
                : files.length > 1
                  ? `Submit ${files.length} Files for Review`
                  : "Submit for Review"}
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

      {/* Duplicate warning dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" /> Possible
              Duplicate
            </DialogTitle>
            <DialogDescription>
              Some files in this batch look similar to materials already
              uploaded for this course:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {duplicateWarning.map((entry: any, index: number) => (
              <div
                key={`${entry.fileName}-${index}`}
                className="rounded-lg border border-border bg-muted/50 p-3"
              >
                <p className="text-sm font-medium text-foreground">
                  {entry.fileName}
                </p>
                <div className="mt-2 space-y-2">
                  {entry.matches.map((match: any) => (
                    <div
                      key={match.id}
                      className="rounded-md border border-border/70 bg-background/70 p-2"
                    >
                      <p className="text-sm text-foreground">{match.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Status: {match.status}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDuplicateDialog(false);
                setDuplicateWarning([]);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleForceSubmit}>Upload Anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SmartBottomNav />
    </div>
  );
}

function StepCard({
  title,
  icon: Icon,
  description,
  children,
}: {
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
      <span className="text-sm font-medium text-foreground text-right max-w-[60%] truncate">
        {value}
      </span>
    </div>
  );
}

export default function CommunityUpload() {
  const navigate = useNavigate();
  const [guestOpen, setGuestOpen] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

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
        onClose={() => {
          setGuestOpen(false);
          navigate(-1);
        }}
      />
      {isAuthed && <CommunityUploadContent />}
    </>
  );
}
