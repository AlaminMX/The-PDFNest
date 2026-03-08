import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRepStatus } from "@/hooks/useRepStatus";
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
import { ArrowLeft, Upload, CheckCircle, AlertCircle, FileType, Loader2, X, FileText, Files } from "lucide-react";
import { toast } from "sonner";
import { DisplayNamePrompt } from "@/components/DisplayNamePrompt";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState } from "@/components/LoadingState";
import { motion, AnimatePresence } from "framer-motion";

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
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const { courses, loading: coursesLoading } = useCourses(departmentId || undefined, 100, selectedSemester || undefined);
  const { uploadNote, convertToPdf } = useLectureNotes();

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [fileQueue, setFileQueue] = useState<FileUploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDisplayNamePrompt, setShowDisplayNamePrompt] = useState(false);
  const [showConversionDialog, setShowConversionDialog] = useState(false);
  const [pendingNonPdfFiles, setPendingNonPdfFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0 });

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
    setUploadProgress({ completed: 0, total: fileQueue.length });

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

        // Upload the file
        updateItemStatus(item.id, 'uploading');
        const success = await uploadNote(
          selectedCourseId,
          course.code,
          departmentName,
          fileToUpload,
          item.title.trim(),
          displayName,
          departmentId || undefined
        );

        if (success) {
          updateItemStatus(item.id, 'success');
          successCount++;
        } else {
          updateItemStatus(item.id, 'error', 'Upload failed');
          errorCount++;
        }
      } catch (err) {
        updateItemStatus(item.id, 'error', err instanceof Error ? err.message : 'Unknown error');
        errorCount++;
      }

      setUploadProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
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
  const canUpload = selectedCourseId && selectedSemester && pendingFiles.length > 0 && !isProcessing;

  return (
    <>
      <DisplayNamePrompt
        open={showDisplayNamePrompt}
        onClose={() => {
          setShowDisplayNamePrompt(false);
          navigate("/dashboard");
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
          backTo="/"
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

              {/* Course Selection */}
              <div className="space-y-2">
                <Label htmlFor="course">Select Course</Label>
                <Select
                  value={selectedCourseId}
                  onValueChange={setSelectedCourseId}
                  disabled={isProcessing || !selectedSemester}
                >
                  <SelectTrigger id="course">
                    <SelectValue placeholder={selectedSemester ? "Choose a course" : "Select semester first"} />
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

              {/* File Input */}
              <div className="space-y-2">
                <Label htmlFor="files">Add Files</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                  <Input
                    id="files"
                    type="file"
                    accept={ACCEPT_TYPES}
                    onChange={handleFileChange}
                    disabled={isProcessing || !selectedCourseId || !selectedSemester}
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
