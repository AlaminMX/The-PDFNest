import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useRepStatus } from "@/hooks/useRepStatus";
import { supabase } from "@/integrations/supabase/client";
import { useCourses } from "@/hooks/useCourses";
import { useLectureNotes } from "@/hooks/useLectureNotes";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  FileType,
  Loader2,
  X,
  FileText,
  Files,
  Plus,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { DisplayNamePrompt } from "@/components/DisplayNamePrompt";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState } from "@/components/LoadingState";
import { CreateCourseModal } from "@/components/CreateCourseModal";
import { motion, AnimatePresence } from "framer-motion";
import { getDepartmentLevels } from "@/lib/departmentLevels";
import { getRepLevelLabel } from "@/lib/repLevelLabels";

const SUPPORTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
];

const ACCEPT_TYPES = ".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx,.ppt,.pptx";

interface FacultyDepartmentOption {
  id: string;
  name: string;
  courseId: string | null; // null → course does not exist in this dept yet
  courseCode: string | null;
  courseName: string | null;
}

type DestStatus = "pending" | "uploading" | "success" | "skipped" | "error";

interface DestinationResult {
  departmentId: string;
  departmentName: string;
  status: DestStatus;
  error?: string;
}

interface FileUploadItem {
  id: string;
  file: File;
  title: string;
  status: "pending" | "converting" | "uploading" | "success" | "partial" | "error";
  progress: number;
  error?: string;
  destinations: DestinationResult[]; // populated when upload starts
  filePath?: string; // set once storage upload finishes
}

const MAX_PARALLEL_DESTINATIONS = 3;

export default function RepUpload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    isRep,
    departmentId,
    departmentName,
    displayName,
    loading: repLoading,
  } = useRepStatus();
  const availableLevels = getDepartmentLevels(departmentName);
  const [selectedLevel, setSelectedLevel] = useState<number>(100);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedMaterialType, setSelectedMaterialType] =
    useState<string>("lecture_note");
  const {
    courses,
    loading: coursesLoading,
    refresh: refreshCourses,
  } = useCourses(
    departmentId || undefined,
    selectedLevel,
    selectedSemester || undefined,
  );
  const { convertToPdf } = useLectureNotes();
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [fileQueue, setFileQueue] = useState<FileUploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDisplayNamePrompt, setShowDisplayNamePrompt] = useState(false);
  const [showConversionDialog, setShowConversionDialog] = useState(false);
  const [pendingNonPdfFiles, setPendingNonPdfFiles] = useState<File[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const [facultyDepartmentOptions, setFacultyDepartmentOptions] = useState<
    FacultyDepartmentOption[]
  >([]);
  const [selectedTargetDepartmentIds, setSelectedTargetDepartmentIds] =
    useState<string[]>([]);

  // Batched confirm for auto-creating the course in sibling departments.
  const [pendingCreateInDepts, setPendingCreateInDepts] = useState<
    FacultyDepartmentOption[] | null
  >(null);
  const [isCreatingCourses, setIsCreatingCourses] = useState(false);

  // Success summary dialog.
  const [summary, setSummary] = useState<FileUploadItem[] | null>(null);

  useEffect(() => {
    if (!repLoading && !isRep) {
      toast.error("Access denied. Rep role required.");
      navigate("/dashboard");
    }
  }, [isRep, repLoading, navigate]);

  useEffect(() => {
    if (!repLoading && isRep && !displayName) {
      setShowDisplayNamePrompt(true);
    }
  }, [displayName, isRep, repLoading]);

  useEffect(() => {
    if (
      !departmentId ||
      !selectedCourseId ||
      !selectedLevel ||
      !selectedSemester
    ) {
      setFacultyDepartmentOptions([]);
      setSelectedTargetDepartmentIds([]);
      return;
    }

    const loadFacultyTargets = async () => {
      const { data: homeDepartment } = await supabase
        .from("departments")
        .select("faculty_id")
        .eq("id", departmentId)
        .maybeSingle();

      if (!homeDepartment?.faculty_id) {
        setFacultyDepartmentOptions([]);
        setSelectedTargetDepartmentIds([departmentId]);
        return;
      }

      const { data: facultyDepartments } = await supabase
        .from("departments")
        .select("id, name")
        .eq("faculty_id", homeDepartment.faculty_id)
        .eq("is_visible", true)
        .order("name");

      const departmentIds = (facultyDepartments || []).map((d) => d.id);
      const selectedCourse = courses.find((c) => c.id === selectedCourseId);
      const normalizedCode = (selectedCourse?.code || "").trim().toUpperCase();

      const { data: matchingCourses } = await supabase
        .from("courses")
        .select("id, code, name, department_id")
        .in("department_id", departmentIds.length ? departmentIds : [departmentId])
        .ilike("code", normalizedCode);

      const courseByDepartment = new Map(
        (matchingCourses || []).map((c: any) => [c.department_id, c]),
      );
      const options: FacultyDepartmentOption[] = (facultyDepartments || []).map(
        (department) => {
          const matchingCourse = courseByDepartment.get(department.id);
          return {
            id: department.id,
            name: department.name,
            courseId: matchingCourse?.id || null,
            courseCode: matchingCourse?.code || null,
            courseName: matchingCourse?.name || null,
          };
        },
      );

      setFacultyDepartmentOptions(options);
      setSelectedTargetDepartmentIds((current) => {
        // Preserve prior selection where still visible; fallback to home dept.
        const visible = new Set(options.map((o) => o.id));
        const kept = current.filter((id) => visible.has(id));
        return kept.length > 0
          ? kept
          : departmentId
            ? [departmentId]
            : [];
      });
    };

    loadFacultyTargets();
  }, [departmentId, selectedCourseId, selectedLevel, selectedSemester, courses]);

  useEffect(() => {
    if (selectedLevel && !availableLevels.includes(selectedLevel as any)) {
      setSelectedLevel(availableLevels[0]);
    }
  }, [selectedLevel, availableLevels]);

  const generateTitle = useCallback((fileName: string, courseCode: string) => {
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    if (baseName.toLowerCase().includes("document") || baseName.length < 3) {
      const today = new Date().toLocaleDateString();
      return `Lecture Notes — ${courseCode} — ${today}`;
    }
    return baseName;
  }, []);

  const addFilesToQueue = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const course = courses.find((c) => c.id === selectedCourseId);
      const courseCode = course?.code || "COURSE";

      const validFiles: File[] = [];
      const nonPdfFiles: File[] = [];
      files.forEach((file) => {
        if (!SUPPORTED_TYPES.includes(file.type)) {
          toast.error(`Unsupported file type: ${file.name}`);
          return;
        }
        if (file.type === "application/pdf") validFiles.push(file);
        else nonPdfFiles.push(file);
      });

      if (validFiles.length > 0) {
        const newItems: FileUploadItem[] = validFiles.map((file) => ({
          id: crypto.randomUUID(),
          file,
          title: generateTitle(file.name, courseCode),
          status: "pending",
          progress: 0,
          destinations: [],
        }));
        setFileQueue((prev) => [...prev, ...newItems]);
      }

      if (nonPdfFiles.length > 0) {
        setPendingNonPdfFiles(nonPdfFiles);
        setShowConversionDialog(true);
      }
    },
    [courses, generateTitle, selectedCourseId],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFilesToQueue(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
    if (isProcessing || !selectedCourseId || !selectedSemester || !selectedLevel)
      return;
    addFilesToQueue(Array.from(e.dataTransfer.files || []));
  };

  const handleConversionAccept = () => {
    setShowConversionDialog(false);
    const course = courses.find((c) => c.id === selectedCourseId);
    const courseCode = course?.code || "COURSE";
    const newItems: FileUploadItem[] = pendingNonPdfFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      title: generateTitle(file.name, courseCode),
      status: "pending",
      progress: 0,
      destinations: [],
    }));
    setFileQueue((prev) => [...prev, ...newItems]);
    setPendingNonPdfFiles([]);
  };

  const handleConversionCancel = () => {
    setShowConversionDialog(false);
    setPendingNonPdfFiles([]);
  };

  const removeFromQueue = (id: string) =>
    setFileQueue((prev) => prev.filter((i) => i.id !== id));

  const updateTitle = (id: string, newTitle: string) =>
    setFileQueue((prev) =>
      prev.map((i) => (i.id === id ? { ...i, title: newTitle } : i)),
    );

  const patchItem = (id: string, patch: Partial<FileUploadItem>) =>
    setFileQueue((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const patchDestination = (
    itemId: string,
    deptId: string,
    patch: Partial<DestinationResult>,
  ) =>
    setFileQueue((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              destinations: i.destinations.map((d) =>
                d.departmentId === deptId ? { ...d, ...patch } : d,
              ),
            }
          : i,
      ),
    );

  const toggleTargetDepartment = (option: FacultyDepartmentOption) => {
    if (isProcessing) return;
    setSelectedTargetDepartmentIds((current) =>
      current.includes(option.id)
        ? current.filter((id) => id !== option.id)
        : [...current, option.id],
    );
  };

  const selectAllTargetDepartments = () => {
    setSelectedTargetDepartmentIds(facultyDepartmentOptions.map((o) => o.id));
  };

  const selectOwnDepartmentOnly = () =>
    setSelectedTargetDepartmentIds(departmentId ? [departmentId] : []);

  const pendingFiles = fileQueue.filter((f) => f.status !== "success");

  const selectedTargetCount =
    facultyDepartmentOptions.length > 0
      ? selectedTargetDepartmentIds.length
      : 1;

  const canUpload =
    selectedCourseId &&
    selectedSemester &&
    selectedLevel &&
    pendingFiles.length > 0 &&
    selectedTargetCount > 0 &&
    !isProcessing;

  const activeCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId),
    [courses, selectedCourseId],
  );

  /**
   * Build the ordered list of destinations for the current upload batch.
   * Every entry references a real (dept, courseId) pair.
   */
  const resolveDestinations = async (): Promise<
    | { ok: true; destinations: Array<{ id: string; name: string; courseId: string }> }
    | { ok: false }
  > => {
    // Case 1: no cross-faculty context loaded — just the home dept + selected course.
    if (facultyDepartmentOptions.length === 0) {
      if (!departmentId || !activeCourse) return { ok: false };
      return {
        ok: true,
        destinations: [
          {
            id: departmentId,
            name: departmentName || "",
            courseId: activeCourse.id,
          },
        ],
      };
    }

    const chosen = facultyDepartmentOptions.filter((o) =>
      selectedTargetDepartmentIds.includes(o.id),
    );
    const missing = chosen.filter((o) => !o.courseId);

    // If any chosen destination is missing the course, ask ONCE, create in parallel.
    if (missing.length > 0) {
      // Show confirm and wait for the user.
      const proceed = await new Promise<boolean>((resolve) => {
        setPendingCreateInDepts(missing);
        // Store the resolver on the state via a closure trick: we listen
        // for setPendingCreateInDepts(null) with the outcome captured below.
        (window as any).__repUploadCreateResolver = resolve;
      });
      if (!proceed) return { ok: false };

      // Create in parallel via ensure_course.
      setIsCreatingCourses(true);
      try {
        const results = await Promise.all(
          missing.map(async (dep) => {
            const { data, error } = await supabase.rpc(
              "ensure_course" as any,
              {
                _dept_id: dep.id,
                _code: activeCourse!.code,
                _name: activeCourse!.name,
                _level: selectedLevel,
                _semester: selectedSemester,
                _credit_units: activeCourse!.credit_units || 0,
              } as any,
            );
            return { dep, courseId: (data as string) || null, error };
          }),
        );
        const failed = results.filter((r) => r.error || !r.courseId);
        if (failed.length > 0) {
          toast.error(
            `Couldn't create the course in ${failed.map((f) => f.dep.name).join(", ")}`,
          );
        }
        // Merge new courseIds into local options.
        setFacultyDepartmentOptions((current) =>
          current.map((o) => {
            const hit = results.find((r) => r.dep.id === o.id && r.courseId);
            return hit
              ? {
                  ...o,
                  courseId: hit.courseId!,
                  courseCode: activeCourse!.code,
                  courseName: activeCourse!.name,
                }
              : o;
          }),
        );
        // Rebuild "chosen" using the updated map.
        const readyMap = new Map<string, string>();
        results.forEach((r) => {
          if (r.courseId) readyMap.set(r.dep.id, r.courseId);
        });
        const destinations = chosen
          .map((o) => {
            const cid = o.courseId || readyMap.get(o.id);
            return cid ? { id: o.id, name: o.name, courseId: cid } : null;
          })
          .filter(Boolean) as Array<{ id: string; name: string; courseId: string }>;
        return destinations.length > 0
          ? { ok: true, destinations }
          : { ok: false };
      } finally {
        setIsCreatingCourses(false);
      }
    }

    const destinations = chosen
      .filter((o) => o.courseId)
      .map((o) => ({ id: o.id, name: o.name, courseId: o.courseId! }));
    return destinations.length > 0
      ? { ok: true, destinations }
      : { ok: false };
  };

  /**
   * Upload one file: convert if needed → put in storage ONCE →
   * fan out to every destination via rep_upload_lecture_note in parallel.
   */
  const processItem = async (
    item: FileUploadItem,
    destinations: Array<{ id: string; name: string; courseId: string }>,
    storageFolderName: string,
  ) => {
    // Seed destinations state.
    const seededDestinations: DestinationResult[] = destinations.map((d) => ({
      departmentId: d.id,
      departmentName: d.name,
      status: "pending",
    }));
    patchItem(item.id, {
      destinations: seededDestinations,
      status: "converting",
      progress: 5,
      error: undefined,
    });

    let fileToUpload = item.file;
    try {
      if (item.file.type !== "application/pdf") {
        const converted = await convertToPdf(item.file);
        if (!converted) throw new Error("Conversion failed");
        fileToUpload = converted;
      }
    } catch (err) {
      patchItem(item.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Conversion failed",
      });
      return;
    }

    // Storage upload — ONCE per file, not per destination.
    patchItem(item.id, { status: "uploading", progress: 20 });
    const primaryCourseCode = activeCourse?.code || "COURSE";
    const filePath = `${storageFolderName}/${primaryCourseCode}/lecture_notes/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("school_pdfs")
      .upload(filePath, fileToUpload);
    if (uploadError) {
      patchItem(item.id, {
        status: "error",
        error: uploadError.message || "Storage upload failed",
      });
      return;
    }
    patchItem(item.id, { progress: 45, filePath });

    // Fan out to destinations with bounded parallelism.
    const runDestination = async (
      dest: { id: string; name: string; courseId: string },
    ) => {
      patchDestination(item.id, dest.id, { status: "uploading" });
      const { error } = await supabase.rpc("rep_upload_lecture_note" as any, {
        _course_id: dest.courseId,
        _file_path: filePath,
        _title: item.title.trim(),
        _file_size: fileToUpload.size,
        _display_name: displayName,
        _material_type: selectedMaterialType,
        _level: selectedLevel,
      } as any);
      if (error) {
        patchDestination(item.id, dest.id, {
          status: "error",
          error: error.message || "Insert failed",
        });
      } else {
        patchDestination(item.id, dest.id, { status: "success" });
        // Fire notifications for that dept (non-blocking).
        supabase.functions
          .invoke("notify-department-users", {
            body: {
              departmentId: dest.id,
              courseCode: primaryCourseCode,
              noteTitle: item.title.trim(),
              uploadedBy: displayName,
            },
          })
          .catch(() => {});
      }
    };

    const queue = [...destinations];
    let done = 0;
    await Promise.all(
      Array.from({ length: Math.min(MAX_PARALLEL_DESTINATIONS, queue.length) }, async () => {
        while (queue.length > 0) {
          const next = queue.shift();
          if (!next) return;
          await runDestination(next);
          done += 1;
          patchItem(item.id, {
            progress: 45 + Math.round((done / destinations.length) * 55),
          });
        }
      }),
    );

    // Compute overall status from destination outcomes.
    setFileQueue((prev) =>
      prev.map((i) => {
        if (i.id !== item.id) return i;
        const ok = i.destinations.filter((d) => d.status === "success").length;
        const bad = i.destinations.filter((d) => d.status === "error").length;
        const total = i.destinations.length;
        let status: FileUploadItem["status"] = "error";
        if (ok === total) status = "success";
        else if (ok > 0) status = "partial";
        // Update storage counter once per file (we only put the object once).
        if (ok > 0 && user) {
          supabase.rpc("update_user_storage", {
            p_user_id: user.id,
            p_size_delta: fileToUpload.size,
          }).catch(() => {});
        }
        return {
          ...i,
          status,
          progress: 100,
          error: bad > 0 ? `${bad} destination(s) failed` : undefined,
        };
      }),
    );
  };

  const handleUploadAll = async () => {
    if (!displayName) {
      toast.error("Set a display name first.");
      return;
    }
    if (!activeCourse || !departmentName) {
      toast.error("Select a course first.");
      return;
    }
    const uploadable = fileQueue.filter(
      (i) => i.status === "pending" || i.status === "error" || i.status === "partial",
    );
    if (uploadable.length === 0) {
      toast.error("Add at least one file.");
      return;
    }

    setIsProcessing(true);
    try {
      const resolved = await resolveDestinations();
      if (!resolved.ok) {
        setIsProcessing(false);
        return;
      }
      // Process files sequentially (each fans out internally). This keeps memory low
      // on large batches and gives clean per-file progress.
      for (const item of uploadable) {
        await processItem(item, resolved.destinations, departmentName);
      }

      const successCount = fileQueue.filter((i) => i.status === "success").length;
      const partialCount = fileQueue.filter((i) => i.status === "partial").length;
      const errorCount = fileQueue.filter((i) => i.status === "error").length;

      // Show summary using the freshest state on next tick.
      setTimeout(() => {
        setFileQueue((current) => {
          setSummary(current);
          return current;
        });
      }, 50);

      if (errorCount === 0 && partialCount === 0 && successCount > 0) {
        toast.success(`Uploaded ${successCount} file${successCount > 1 ? "s" : ""}`);
      } else if (errorCount > 0) {
        toast.warning(`${errorCount} upload${errorCount > 1 ? "s" : ""} failed`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const retryDestinationsForItem = async (itemId: string) => {
    const item = fileQueue.find((i) => i.id === itemId);
    if (!item || !item.filePath) return;
    const failed = item.destinations.filter((d) => d.status === "error");
    if (failed.length === 0) return;

    setIsProcessing(true);
    try {
      for (const dest of failed) {
        // We need the course id for this destination. Look it up from options.
        const option = facultyDepartmentOptions.find(
          (o) => o.id === dest.departmentId,
        );
        let courseId = option?.courseId || null;
        if (!courseId && activeCourse) {
          const { data } = await supabase.rpc("ensure_course" as any, {
            _dept_id: dest.departmentId,
            _code: activeCourse.code,
            _name: activeCourse.name,
            _level: selectedLevel,
            _semester: selectedSemester,
            _credit_units: activeCourse.credit_units || 0,
          } as any);
          courseId = (data as string) || null;
        }
        if (!courseId) {
          patchDestination(itemId, dest.departmentId, {
            status: "error",
            error: "Missing target course",
          });
          continue;
        }
        patchDestination(itemId, dest.departmentId, {
          status: "uploading",
          error: undefined,
        });
        const { error } = await supabase.rpc("rep_upload_lecture_note" as any, {
          _course_id: courseId,
          _file_path: item.filePath,
          _title: item.title.trim(),
          _file_size: item.file.size,
          _display_name: displayName,
          _material_type: selectedMaterialType,
          _level: selectedLevel,
        } as any);
        patchDestination(
          itemId,
          dest.departmentId,
          error
            ? { status: "error", error: error.message || "Insert failed" }
            : { status: "success" },
        );
      }
      // Recompute status
      setFileQueue((prev) =>
        prev.map((i) => {
          if (i.id !== itemId) return i;
          const ok = i.destinations.filter((d) => d.status === "success").length;
          const bad = i.destinations.filter((d) => d.status === "error").length;
          const total = i.destinations.length;
          let status: FileUploadItem["status"] = "error";
          if (ok === total) status = "success";
          else if (ok > 0) status = "partial";
          return {
            ...i,
            status,
            error: bad > 0 ? `${bad} destination(s) failed` : undefined,
          };
        }),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const clearQueue = () => setFileQueue([]);

  if (repLoading || coursesLoading) {
    return (
      <>
        <LoadingState />
        <SmartBottomNav />
      </>
    );
  }

  const filesCount = pendingFiles.length;
  const destsCount = selectedTargetCount;

  return (
    <>
      <DisplayNamePrompt
        open={showDisplayNamePrompt}
        onClose={() => {
          setShowDisplayNamePrompt(false);
          navigate("/dashboard");
        }}
      />

      <CreateCourseModal
        open={showCreateCourseModal}
        onClose={() => setShowCreateCourseModal(false)}
        mode="rep"
        departmentId={departmentId}
        departmentName={departmentName}
        initialLevel={selectedLevel}
        initialSemester={(selectedSemester as "first" | "second") || "first"}
        onCreated={(newId) => {
          refreshCourses();
          setSelectedCourseId(newId);
        }}
      />

      {/* Conversion Dialog */}
      <Dialog open={showConversionDialog} onOpenChange={setShowConversionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileType className="h-5 w-5" />
              Convert {pendingNonPdfFiles.length} file
              {pendingNonPdfFiles.length > 1 ? "s" : ""} to PDF?
            </DialogTitle>
            <DialogDescription>
              These files aren't PDFs and will be converted before upload:
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 max-h-40 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {pendingNonPdfFiles.map((file, idx) => (
                <li key={idx} className="text-muted-foreground truncate">
                  • {file.name}
                </li>
              ))}
            </ul>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Supported: Images (PNG, JPG), TXT, Word, PowerPoint.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={handleConversionCancel}>
              Skip These Files
            </Button>
            <Button onClick={handleConversionAccept}>Add to Queue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single batched confirm dialog for auto-creating the course in sibling depts */}
      <AlertDialog
        open={!!pendingCreateInDepts}
        onOpenChange={(open) => {
          if (!open && !isCreatingCourses) {
            (window as any).__repUploadCreateResolver?.(false);
            (window as any).__repUploadCreateResolver = undefined;
            setPendingCreateInDepts(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Create {activeCourse?.code || "this course"} in{" "}
              {pendingCreateInDepts?.length || 0} department
              {(pendingCreateInDepts?.length || 0) === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(pendingCreateInDepts || [])
                .map((d) => d.name)
                .join(", ")}
              {" "}
              don't have this course yet. We'll create it and continue the
              upload automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreatingCourses}>
              Skip these
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isCreatingCourses}
              onClick={(e) => {
                e.preventDefault();
                (window as any).__repUploadCreateResolver?.(true);
                (window as any).__repUploadCreateResolver = undefined;
                setPendingCreateInDepts(null);
              }}
            >
              {isCreatingCourses ? "Creating…" : "Create & Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Summary Dialog */}
      <Dialog
        open={!!summary}
        onOpenChange={(open) => {
          if (!open) {
            setSummary(null);
            // Prune successful items after the user closes the summary.
            setFileQueue((prev) => prev.filter((i) => i.status !== "success"));
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload complete</DialogTitle>
            <DialogDescription>
              {summary?.length || 0} file{(summary?.length || 0) === 1 ? "" : "s"} processed
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-3">
            {(summary || []).map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <p className="font-medium text-sm truncate">{item.title}</p>
                <ul className="mt-2 space-y-1 text-xs">
                  {item.destinations.map((d) => (
                    <li key={d.departmentId} className="flex items-center gap-2">
                      {d.status === "success" ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      ) : d.status === "error" ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      <span
                        className={
                          d.status === "success"
                            ? "text-foreground"
                            : d.status === "error"
                              ? "text-red-600"
                              : "text-muted-foreground"
                        }
                      >
                        {d.departmentName}
                        {d.status === "error" && d.error ? ` — ${d.error}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setSummary(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 pb-24">
        <PageHeader
          title="Upload Lecture Notes"
          subtitle={departmentName || ""}
          showBack
          backTo="/dashboard"
        />

        <main className="container mx-auto px-4 py-6 md:py-8 max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Files className="h-5 w-5" />
                Batch Upload
              </CardTitle>
              <CardDescription>
                Upload one file to multiple departments in your faculty in a single go.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Level Selection */}
              <div className="space-y-2">
                <Label htmlFor="level">Select Level</Label>
                <Select
                  value={String(selectedLevel)}
                  onValueChange={(val) => {
                    setSelectedLevel(Number(val));
                    setSelectedCourseId("");
                  }}
                  disabled={isProcessing}
                >
                  <SelectTrigger id="level">
                    <SelectValue placeholder="Choose a level" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLevels.map((level) => (
                      <SelectItem key={level} value={String(level)}>
                        {getRepLevelLabel(level)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Semester Selection */}
              <div className="space-y-2">
                <Label htmlFor="semester">Select Semester</Label>
                <Select
                  value={selectedSemester}
                  onValueChange={(val) => {
                    setSelectedSemester(val);
                    setSelectedCourseId("");
                  }}
                  disabled={isProcessing}
                >
                  <SelectTrigger id="semester">
                    <SelectValue placeholder="Choose a semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">First Semester</SelectItem>
                    <SelectItem value="second">Second Semester</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Material Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="material-type">Material Type</Label>
                <Select
                  value={selectedMaterialType}
                  onValueChange={setSelectedMaterialType}
                  disabled={isProcessing}
                >
                  <SelectTrigger id="material-type">
                    <SelectValue placeholder="Choose material type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecture_note">Lecture Note</SelectItem>
                    <SelectItem value="past_question">Past Question</SelectItem>
                    <SelectItem value="handout">Handout</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="tutorial">Tutorial</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Course Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="course">Select Course</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-primary hover:text-primary"
                    onClick={() => setShowCreateCourseModal(true)}
                    disabled={isProcessing || !departmentId}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New course
                  </Button>
                </div>
                <Select
                  value={selectedCourseId}
                  onValueChange={setSelectedCourseId}
                  disabled={isProcessing || !selectedSemester || !selectedLevel}
                >
                  <SelectTrigger id="course">
                    <SelectValue
                      placeholder={
                        selectedSemester
                          ? "Choose a course"
                          : "Select level and semester first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Faculty Department Targets */}
              {facultyDepartmentOptions.length > 0 && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label className="text-base">
                        Departments to receive this upload
                      </Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pick any departments in your faculty. If they don't
                        have {activeCourse?.code || "this course"} yet, we'll
                        create it there.
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={selectAllTargetDepartments}
                        disabled={isProcessing}
                      >
                        Select all
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={selectOwnDepartmentOnly}
                        disabled={isProcessing}
                      >
                        Mine only
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {facultyDepartmentOptions.map((option) => {
                      const checked = selectedTargetDepartmentIds.includes(
                        option.id,
                      );
                      const isHome = option.id === departmentId;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleTargetDepartment(option)}
                          disabled={isProcessing}
                          className={`w-full rounded-lg border p-3 text-left transition-colors ${
                            checked
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                            >
                              {checked && <CheckCircle className="h-3.5 w-3.5" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-foreground">
                                {option.name}
                                {isHome ? " (your department)" : ""}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {option.courseId
                                  ? `${option.courseCode} — ${option.courseName}`
                                  : `Will create ${activeCourse?.code || "this course"} here on upload`}
                              </span>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* File Input */}
              <div className="space-y-2">
                <Label htmlFor="files">Add Files</Label>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${isDraggingFiles ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDraggingFiles(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFiles(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDraggingFiles(false);
                  }}
                  onDrop={handleDrop}
                >
                  <Input
                    id="files"
                    type="file"
                    accept={ACCEPT_TYPES}
                    onChange={handleFileChange}
                    disabled={
                      isProcessing ||
                      !selectedCourseId ||
                      !selectedSemester ||
                      !selectedLevel
                    }
                    className="hidden"
                    multiple
                  />
                  <label
                    htmlFor="files"
                    className={`cursor-pointer flex flex-col items-center gap-2 ${!selectedCourseId || !selectedSemester ? "opacity-50" : ""}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {selectedCourseId
                          ? "Drag & drop PDFs here or click to browse"
                          : "Select a course first"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, Images, TXT, DOC, DOCX, PPT, PPTX • Multiple files supported
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* File Queue */}
              {fileQueue.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">
                      Upload Queue ({fileQueue.length})
                    </Label>
                    {!isProcessing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearQueue}
                        className="text-muted-foreground"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>

                  <ScrollArea className="max-h-96">
                    <div className="space-y-2 pr-4">
                      <AnimatePresence mode="popLayout">
                        {fileQueue.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            className={`p-3 rounded-lg border ${
                              item.status === "success"
                                ? "border-green-500/50 bg-green-50 dark:bg-green-950/20"
                                : item.status === "error"
                                  ? "border-red-500/50 bg-red-50 dark:bg-red-950/20"
                                  : item.status === "partial"
                                    ? "border-amber-500/50 bg-amber-50 dark:bg-amber-950/20"
                                    : "border-border bg-muted/30"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  item.status === "success"
                                    ? "bg-green-500/20"
                                    : item.status === "error"
                                      ? "bg-red-500/20"
                                      : item.status === "partial"
                                        ? "bg-amber-500/20"
                                        : "bg-primary/10"
                                }`}
                              >
                                {item.status === "success" ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : item.status === "error" ? (
                                  <AlertCircle className="h-5 w-5 text-red-600" />
                                ) : item.status === "converting" ||
                                  item.status === "uploading" ? (
                                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                ) : (
                                  <FileText className="h-5 w-5 text-primary" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                {item.status === "pending" && !isProcessing ? (
                                  <Input
                                    value={item.title}
                                    onChange={(e) => updateTitle(item.id, e.target.value)}
                                    className="h-8 text-sm"
                                    placeholder="Enter title"
                                  />
                                ) : (
                                  <p className="font-medium text-sm truncate">
                                    {item.title}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground truncate">
                                    {item.file.name}
                                  </p>
                                  <span className="text-xs text-muted-foreground">
                                    ({(item.file.size / (1024 * 1024)).toFixed(2)} MB)
                                  </span>
                                </div>
                                {(item.status === "uploading" ||
                                  item.status === "converting") && (
                                  <Progress value={item.progress} className="mt-2 h-1.5" />
                                )}
                                {item.destinations.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {item.destinations.map((d) => (
                                      <span
                                        key={d.departmentId}
                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                                          d.status === "success"
                                            ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
                                            : d.status === "error"
                                              ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400"
                                              : d.status === "uploading"
                                                ? "border-primary/30 bg-primary/10 text-primary"
                                                : "border-border bg-muted text-muted-foreground"
                                        }`}
                                        title={d.error || d.departmentName}
                                      >
                                        {d.status === "success" && (
                                          <CheckCircle className="w-3 h-3" />
                                        )}
                                        {d.status === "error" && (
                                          <AlertCircle className="w-3 h-3" />
                                        )}
                                        {d.status === "uploading" && (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        )}
                                        {d.departmentName}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {item.error && (
                                  <p className="text-xs text-red-600 mt-1">{item.error}</p>
                                )}
                                {item.status === "partial" && !isProcessing && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 h-7 text-xs gap-1"
                                    onClick={() => retryDestinationsForItem(item.id)}
                                  >
                                    <RotateCw className="w-3 h-3" />
                                    Retry failed destinations
                                  </Button>
                                )}
                              </div>

                              {item.status === "pending" && !isProcessing && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 flex-shrink-0"
                                  onClick={() => removeFromQueue(item.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Non-PDF files will be converted automatically. Uploaded files
                  will be visible to students in each selected department.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleUploadAll}
                disabled={!canUpload}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {filesCount} document{filesCount === 1 ? "" : "s"}
                    {facultyDepartmentOptions.length > 0
                      ? ` · ${destsCount} destination${destsCount === 1 ? "" : "s"}`
                      : ""}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </main>

        <SmartBottomNav />
      </div>
    </>
  );
}
