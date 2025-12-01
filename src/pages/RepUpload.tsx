import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRepStatus } from "@/hooks/useRepStatus";
import { useCourses } from "@/hooks/useCourses";
import { useLectureNotes } from "@/hooks/useLectureNotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { DisplayNamePrompt } from "@/components/DisplayNamePrompt";

export default function RepUpload() {
  const navigate = useNavigate();
  const { isRep, departmentId, departmentName, displayName, loading: repLoading } = useRepStatus();
  const { courses, loading: coursesLoading } = useCourses(departmentId || undefined);
  const { uploading, uploadNote } = useLectureNotes();

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showDisplayNamePrompt, setShowDisplayNamePrompt] = useState(false);

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
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are allowed");
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        toast.error("File size must be less than 25MB");
        return;
      }
      setSelectedFile(file);
    }
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
      
      // Reset success state after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    }
  };

  if (repLoading || coursesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/10">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DisplayNamePrompt
        open={showDisplayNamePrompt}
        onClose={() => {
          setShowDisplayNamePrompt(false);
          navigate("/");
        }}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Upload Lecture Notes</h1>
                <p className="text-sm text-muted-foreground">{departmentName}</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-2xl">
          {uploadSuccess && (
            <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
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
                  disabled={uploading}
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
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground">
                  Suggested format: Lecture Notes — [Course Code] — [Date/Week]
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">PDF File</Label>
                <Input
                  id="file"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum file size: 25MB • Only PDF files allowed
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Only upload lecture notes for courses in {departmentName}. 
                  Content must be appropriate and relevant to the selected course.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleUpload}
                disabled={!selectedCourseId || !selectedFile || !title.trim() || uploading}
                className="w-full"
                size="lg"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Uploading...
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
      </div>
    </>
  );
}
