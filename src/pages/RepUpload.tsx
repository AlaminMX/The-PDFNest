import { useState, useEffect } from "react";
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
import { ArrowLeft, Upload, CheckCircle, AlertCircle, FileType, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { DisplayNamePrompt } from "@/components/DisplayNamePrompt";
import { RepBottomNav } from "@/components/RepBottomNav";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState } from "@/components/LoadingState";

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

export default function RepUpload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRep, departmentId, departmentName, displayName, loading: repLoading } = useRepStatus();
  const { courses, loading: coursesLoading } = useCourses(departmentId || undefined);
  const { uploading, converting, uploadNote, convertToPdf } = useLectureNotes();

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showDisplayNamePrompt, setShowDisplayNamePrompt] = useState(false);
  const [showConversionDialog, setShowConversionDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    if (!repLoading && !isRep) {
      toast.error("Access denied. Rep role required.");
      navigate("/");
    }
  }, [isRep, repLoading, navigate]);

  useEffect(() => {
    if (!repLoading && isRep && !displayName) {
      setShowDisplayNamePrompt(true);
    }
  }, [displayName, isRep, repLoading]);

  useEffect(() => {
    if (selectedCourseId) {
      const course = courses.find(c => c.id === selectedCourseId);
      if (course) {
        const today = new Date().toLocaleDateString();
        setTitle(`Lecture Notes — ${course.code} — ${today}`);
      }
    }
  }, [selectedCourseId, courses]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if file type is supported
      if (!SUPPORTED_TYPES.includes(file.type)) {
        toast.error("Unsupported file type. Supported: PDF, Images (PNG, JPG), TXT, DOC, DOCX, PPT, PPTX");
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        toast.error("File size must be less than 25MB");
        return;
      }

      // If it's a PDF, set it directly
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        setPendingFile(null);
      } else {
        // Show conversion dialog for non-PDF files
        setPendingFile(file);
        setShowConversionDialog(true);
      }
    }
  };

  const handleConversionAccept = async () => {
    if (!pendingFile) return;

    setShowConversionDialog(false);
    
    try {
      const convertedFile = await convertToPdf(pendingFile);
      
      if (convertedFile) {
        setSelectedFile(convertedFile);
        toast.success("File converted to PDF successfully!");
      } else {
        // Reset file input on failure
        const fileInput = document.getElementById('file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      console.error("Conversion error:", error);
      const fileInput = document.getElementById('file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
    
    setPendingFile(null);
  };

  const handleConversionCancel = () => {
    setShowConversionDialog(false);
    setPendingFile(null);
    // Reset the file input
    const fileInput = document.getElementById('file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleUpload = async () => {
    if (!selectedCourseId || !selectedFile || !title.trim() || !displayName) {
      toast.error("Please complete all fields");
      return;
    }

    const course = courses.find(c => c.id === selectedCourseId);
    if (!course || !departmentName) {
      toast.error("Course information not found");
      return;
    }

    const success = await uploadNote(
      selectedCourseId,
      course.code,
      departmentName,
      selectedFile,
      title.trim(),
      displayName
    );

    if (success) {
      setUploadSuccess(true);
      setSelectedCourseId("");
      setSelectedFile(null);
      setTitle("");
      // Reset the file input
      const fileInput = document.getElementById('file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Reset success state after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    }
  };

  if (repLoading || coursesLoading) {
    return <LoadingState />;
  }

  const isProcessing = uploading || converting;

  return (
    <>
      <DisplayNamePrompt
        open={showDisplayNamePrompt}
        onClose={() => {
          setShowDisplayNamePrompt(false);
          navigate("/");
        }}
      />

      {/* Conversion Dialog */}
      <Dialog open={showConversionDialog} onOpenChange={setShowConversionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileType className="h-5 w-5" />
              Convert to PDF?
            </DialogTitle>
            <DialogDescription>
              The file "{pendingFile?.name}" is not a PDF. Would you like to convert it to PDF format before uploading?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Supported conversions: Images (PNG, JPG), Text files, Word documents (DOC, DOCX), and PowerPoint files (PPT, PPTX).
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleConversionCancel}>
              Cancel
            </Button>
            <Button onClick={handleConversionAccept}>
              Convert & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
        <PageHeader
          title="Upload Lecture Notes"
          subtitle={departmentName || ""}
          showBack
          backTo="/"
        />

        <main className="container mx-auto px-4 py-6 md:py-8 max-w-2xl space-y-6">
          {uploadSuccess && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Lecture note uploaded successfully! Students can now access it.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Upload New Lecture Note</CardTitle>
              <CardDescription>
                Share lecture notes with students in your department
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="course">Select Course</Label>
                <Select
                  value={selectedCourseId}
                  onValueChange={setSelectedCourseId}
                  disabled={isProcessing}
                >
                  <SelectTrigger id="course">
                    <SelectValue placeholder="Choose a course" />
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

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Lecture Notes — CS101 — 2024-12-01"
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  Suggested format: Lecture Notes — [Course Code] — [Date/Week]
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Document File</Label>
                <Input
                  id="file"
                  type="file"
                  accept={ACCEPT_TYPES}
                  onChange={handleFileChange}
                  disabled={isProcessing}
                  className="cursor-pointer"
                />
                {converting && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Converting file to PDF...
                  </div>
                )}
                {selectedFile && !converting && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum file size: 25MB • Supported: PDF, Images, TXT, DOC, DOCX, PPT, PPTX
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Only upload lecture notes for courses in {departmentName}. 
                  Content must be appropriate and relevant to the selected course.
                  Non-PDF files will be converted to PDF before uploading.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleUpload}
                disabled={!selectedCourseId || !selectedFile || !title.trim() || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {converting ? "Converting..." : "Uploading..."}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Lecture Note
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </main>
        
        {user && <RepBottomNav repUserId={user.id} />}
      </div>
    </>
  );
}
