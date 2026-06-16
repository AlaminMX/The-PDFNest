import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRepStatus } from "@/hooks/useRepStatus";
import { supabase } from "@/integrations/supabase/client";
import { useCourses } from "@/hooks/useCourses";
import { useLectureNotes } from "@/hooks/useLectureNotes";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Upload, CheckCircle, AlertCircle, FileType, Loader2, X, FileText, Files, Plus } from "lucide-react";
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
  courseId: string | null;
  courseCode: string | null;
  courseName: string | null;
}

interface FileUploadItem {
  id: string;
  file: File;
  title: string;
  status: 'pending' | 'converting' | 'uploading' | 'success' | 'error';
  error?: string;
  convertedFile?: File;
}

export default function RepUpload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRep, departmentId, departmentName, displayName, loading: repLoading } = useRepStatus();
  const availableLevels = getDepartmentLevels(departmentName);
  const [selectedLevel, setSelectedLevel] = useState<number>(100);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>("lecture_note");
  const { courses, loading: coursesLoading, refresh: refreshCourses } = useCourses(departmentId || undefined, selectedLevel, selectedSemester || undefined);
  const { uploadNote, convertToPdf } = useLectureNotes();
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [fileQueue, setFileQueue] = useState<FileUploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDisplayNamePrompt, setShowDisplayNamePrompt] = useState(false);
  const [showConversionDialog, setShowConversionDialog] = useState(false);
  const [pendingNonPdfFiles, setPendingNonPdfFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0 });
  const [facultyDepartmentOptions, setFacultyDepartmentOptions] = useState<FacultyDepartmentOption[]>([]);
  const [selectedTargetDepartmentIds, setSelectedTargetDepartmentIds] = useState<string[]>([]);

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
    if (!departmentId || !selectedCourseId || !selectedLevel || !selectedSemester) {
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

      const departmentIds = (facultyDepartments || []).map((department) => department.id);
      const selectedCourse = courses.find((course) => course.id === selectedCourseId);

      const { data: matchingCourses } = await supabase
        .from("courses")
        .select("id, code, name, department_id")
        .in("department_id", departmentIds.length ? departmentIds : [departmentId])
        .eq("level", selectedLevel)
        .eq("semester", selectedSemester)
        .ilike("code", selectedCourse?.code || "");

      const courseByDepartment = new Map((matchingCourses || []).map((course: any) => [course.department_id, course]));
      const options = (facultyDepartments || []).map((department) => {
        const matchingCourse = courseByDepartment.get(department.id);
        return {
          id: department.id,
          name: department.name,
          courseId: matchingCourse?.id || null,
          courseCode: matchingCourse?.code || null,
          courseName: matchingCourse?.name || null,
        };
      });

      setFacultyDepartmentOptions(options);
      setSelectedTargetDepartmentIds((current) => {
        const valid = new Set(options.filter((option) => option.courseId).map((option) => option.id));
        const next = current.filter((id) => valid.has(id));
        return next.length > 0 ? next : [departmentId];
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
    // Remove file extension and clean up the name
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    // If it looks like a generic name, use the date format
    if (baseName.toLowerCase().includes('document') || baseName.length < 3) {
      const today = new Date().toLocaleDateString();
      return `Lecture Notes — ${courseCode} — ${today}`;
    }
    return baseName;
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const course = courses.find(c => c.id === selectedCourseId);
    const courseCode = course?.code || 'COURSE';

    const validFiles: File[] = [];
    const nonPdfFiles: File[] = [];

    files.forEach(file => {
      if (!SUPPORTED_TYPES.includes(file.type)) {
        toast.error(`Unsupported file type: ${file.name}`);
        return;
      }

      if (file.type === "application/pdf") {
        validFiles.push(file);
      } else {
        nonPdfFiles.push(file);
      }
    });

    // Add PDF files directly to queue
    if (validFiles.length > 0) {
      const newItems: FileUploadItem[] = validFiles.map(file => ({
        id: crypto.randomUUID(),
        file,
        title: generateTitle(file.name, courseCode),
        status: 'pending' as const,
      }));
      setFileQueue(prev => [...prev, ...newItems]);
    }

    // If there are non-PDF files, show conversion dialog
    if (nonPdfFiles.length > 0) {
      setPendingNonPdfFiles(nonPdfFiles);
      setShowConversionDialog(true);
    }

    // Reset file input
    e.target.value = '';
  };

  const handleConversionAccept = async () => {
    setShowConversionDialog(false);
    
    const course = courses.find(c => c.id === selectedCourseId);
    const courseCode = course?.code || 'COURSE';

    // Add non-PDF files to queue with pending status
    const newItems: FileUploadItem[] = pendingNonPdfFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      title: generateTitle(file.name, courseCode),
      status: 'pending' as const,
    }));
    
    setFileQueue(prev => [...prev, ...newItems]);
    setPendingNonPdfFiles([]);
  };

  const handleConversionCancel = () => {
    setShowConversionDialog(false);
    setPendingNonPdfFiles([]);
  };

  const removeFromQueue = (id: string) => {
    setFileQueue(prev => prev.filter(item => item.id !== id));
  };

  const updateTitle = (id: string, newTitle: string) => {
    setFileQueue(prev => prev.map(item => 
      item.id === id ? { ...item, title: newTitle } : item
    ));
  };

  const updateItemStatus = (id: string, status: FileUploadItem['status'], error?: string) => {
    setFileQueue(prev => prev.map(item => 
      item.id === id ? { ...item, status, error } : item
    ));
  };

  const handleUploadAll = async () => {
    if (!selectedCourseId || fileQueue.length === 0 || !displayName) {
      toast.error("Please select a course and add files");
      return;
    }

    const course = courses.find(c => c.id === selectedCourseId);
    if (!course || !departmentName) {
      toast.error("Course information not found");
      return;
    }

    setIsProcessing(true);
    const uploadTargets = facultyDepartmentOptions.length > 0
      ? facultyDepartmentOptions.filter((option) => selectedTargetDepartmentIds.includes(option.id) && option.courseId)
      : [{ id: departmentId || "", name: departmentName, courseId: selectedCourseId, courseCode: course.code, courseName: course.name }];

    if (uploadTargets.length === 0) {
      toast.error("Select at least one department with this course available.");
      return;
    }

    setUploadProgress({ completed: 0, total: fileQueue.length * uploadTargets.length });

    let successCount = 0;
    let errorCount = 0;

    for (const item of fileQueue) {
      if (item.status === 'success') {
        setUploadProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
        continue;
      }

      try {
        let fileToUpload = item.file;

        // Convert non-PDF files
        if (item.file.type !== "application/pdf") {
          updateItemStatus(item.id, 'converting');
          const converted = await convertToPdf(item.file);
          if (!converted) {
            updateItemStatus(item.id, 'error', 'Conversion failed');
            errorCount++;
            setUploadProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
            continue;
          }
          fileToUpload = converted;
        }

        updateItemStatus(item.id, 'uploading');

        let itemSucceeded = false;
        for (const target of uploadTargets) {
          const success = await uploadNote(
            target.courseId!,
            target.courseCode || course.code,
            target.name || departmentName,
            fileToUpload,
            item.title.trim(),
            displayName,
            target.id || undefined,
            selectedMaterialType
          );

          if (success) {
            itemSucceeded = true;
            successCount++;
          } else {
            errorCount++;
          }
          setUploadProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
        }

        if (itemSucceeded) {
          updateItemStatus(item.id, 'success');
        } else {
          updateItemStatus(item.id, 'error', 'Upload failed');
        }
      } catch (err) {
        updateItemStatus(item.id, 'error', err instanceof Error ? err.message : 'Unknown error');
        errorCount++;
      }

      if (uploadTargets.length === 0) {
        setUploadProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
      }
    }

    setIsProcessing(false);

    if (successCount > 0 && errorCount === 0) {
      toast.success(`Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}!`);
      // Clear successful items after a delay
      setTimeout(() => {
        setFileQueue(prev => prev.filter(item => item.status !== 'success'));
      }, 2000);
    } else if (successCount > 0 && errorCount > 0) {
      toast.warning(`Uploaded ${successCount} file${successCount > 1 ? 's' : ''}, ${errorCount} failed`);
    } else if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} file${errorCount > 1 ? 's' : ''}`);
    }
  };

  const clearQueue = () => {
    setFileQueue([]);
  };

  if (repLoading || coursesLoading) {
    return (
      <>
        <LoadingState />
        <SmartBottomNav />
      </>
    );
  }

  const pendingFiles = fileQueue.filter(f => f.status === 'pending');
  const selectedTargetCount = facultyDepartmentOptions.length > 0 ? selectedTargetDepartmentIds.length : 1;
  const canUpload = selectedCourseId && selectedSemester && selectedLevel && pendingFiles.length > 0 && selectedTargetCount > 0 && !isProcessing;

  const toggleTargetDepartment = (departmentOption: FacultyDepartmentOption) => {
    if (!departmentOption.courseId || isProcessing) return;
    setSelectedTargetDepartmentIds((current) =>
      current.includes(departmentOption.id)
        ? current.filter((id) => id !== departmentOption.id)
        : [...current, departmentOption.id]
    );
  };

  const selectAllTargetDepartments = () => {
    setSelectedTargetDepartmentIds(facultyDepartmentOptions.filter((option) => option.courseId).map((option) => option.id));
  };

  const selectOwnDepartmentOnly = () => {
    setSelectedTargetDepartmentIds(departmentId ? [departmentId] : []);
  };

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
          // Refresh course list and auto-select the new course if levels/sem match
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
              Convert {pendingNonPdfFiles.length} file{pendingNonPdfFiles.length > 1 ? 's' : ''} to PDF?
            </DialogTitle>
            <DialogDescription>
              The following files are not PDFs and will be converted:
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
              Supported conversions: Images (PNG, JPG), Text files, Word documents, and PowerPoint files.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={handleConversionCancel}>
              Skip These Files
            </Button>
            <Button onClick={handleConversionAccept}>
              Add to Queue
            </Button>
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
                Upload multiple lecture notes at once to your department
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
                      <SelectItem key={level} value={String(level)}>{getRepLevelLabel(level)}</SelectItem>
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
                    <SelectValue placeholder={selectedSemester ? "Choose a course" : "Select level and semester first"} />
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
                      <Label className="text-base">Departments to receive this upload</Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Choose departments in your faculty that offer {course?.code || "this course"}.
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={selectAllTargetDepartments} disabled={isProcessing}>
                        Select all
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={selectOwnDepartmentOnly} disabled={isProcessing}>
                        Mine only
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {facultyDepartmentOptions.map((option) => {
                      const checked = selectedTargetDepartmentIds.includes(option.id);
                      const isHome = option.id === departmentId;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleTargetDepartment(option)}
                          disabled={!option.courseId || isProcessing}
                          className={`w-full rounded-lg border p-3 text-left transition-colors ${
                            checked
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background hover:border-primary/50"
                          } ${!option.courseId ? "cursor-not-allowed opacity-55" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                              {checked && <CheckCircle className="h-3.5 w-3.5" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-foreground">
                                {option.name}{isHome ? " (your department)" : ""}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {option.courseId
                                  ? `${option.courseCode} — ${option.courseName}`
                                  : `No matching ${course?.code || "course"} course for this level/semester`}
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
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                  <Input
                    id="files"
                    type="file"
                    accept={ACCEPT_TYPES}
                    onChange={handleFileChange}
                    disabled={isProcessing || !selectedCourseId || !selectedSemester || !selectedLevel}
                    className="hidden"
                    multiple
                  />
                  <label 
                    htmlFor="files" 
                    className={`cursor-pointer flex flex-col items-center gap-2 ${!selectedCourseId || !selectedSemester ? 'opacity-50' : ''}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {selectedCourseId ? 'Click to select files' : 'Select a course first'}
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
                    <Label className="text-base">Upload Queue ({fileQueue.length})</Label>
                    {!isProcessing && (
                      <Button variant="ghost" size="sm" onClick={clearQueue} className="text-muted-foreground">
                        Clear All
                      </Button>
                    )}
                  </div>
                  
                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress.completed}/{uploadProgress.total}</span>
                      </div>
                      <Progress value={(uploadProgress.completed / uploadProgress.total) * 100} />
                    </div>
                  )}

                  <ScrollArea className="max-h-80">
                    <div className="space-y-2 pr-4">
                      <AnimatePresence mode="popLayout">
                        {fileQueue.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            className={`p-3 rounded-lg border ${
                              item.status === 'success' 
                                ? 'border-green-500/50 bg-green-50 dark:bg-green-950/20' 
                                : item.status === 'error'
                                ? 'border-red-500/50 bg-red-50 dark:bg-red-950/20'
                                : 'border-border bg-muted/30'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                item.status === 'success' 
                                  ? 'bg-green-500/20' 
                                  : item.status === 'error'
                                  ? 'bg-red-500/20'
                                  : 'bg-primary/10'
                              }`}>
                                {item.status === 'success' ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : item.status === 'error' ? (
                                  <AlertCircle className="h-5 w-5 text-red-600" />
                                ) : item.status === 'converting' || item.status === 'uploading' ? (
                                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                ) : (
                                  <FileText className="h-5 w-5 text-primary" />
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                {item.status === 'pending' && !isProcessing ? (
                                  <Input
                                    value={item.title}
                                    onChange={(e) => updateTitle(item.id, e.target.value)}
                                    className="h-8 text-sm"
                                    placeholder="Enter title"
                                  />
                                ) : (
                                  <p className="font-medium text-sm truncate">{item.title}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground truncate">
                                    {item.file.name}
                                  </p>
                                  <span className="text-xs text-muted-foreground">
                                    ({(item.file.size / (1024 * 1024)).toFixed(2)} MB)
                                  </span>
                                </div>
                                {item.status === 'converting' && (
                                  <p className="text-xs text-primary mt-1">Converting to PDF...</p>
                                )}
                                {item.status === 'uploading' && (
                                  <p className="text-xs text-primary mt-1">Uploading...</p>
                                )}
                                {item.error && (
                                  <p className="text-xs text-red-600 mt-1">{item.error}</p>
                                )}
                              </div>

                              {item.status === 'pending' && !isProcessing && (
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
                  Only upload lecture notes for courses in {departmentName}. 
                  Non-PDF files will be converted automatically.
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
                    Uploading {uploadProgress.completed}/{uploadProgress.total}...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {pendingFiles.length > 0 ? `${pendingFiles.length} File${pendingFiles.length > 1 ? 's' : ''}` : 'Files'}
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
