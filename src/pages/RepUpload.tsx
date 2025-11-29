import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRepStatus } from "@/hooks/useRepStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Upload, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function RepUpload() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isRep, loading: repLoading } = useRepStatus();
  
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (authLoading || repLoading) return;
    
    if (!user || !isRep) {
      navigate("/");
      return;
    }

    loadCourses();
  }, [user, isRep, authLoading, repLoading, navigate]);

  const loadCourses = async () => {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", user!.id)
        .single();

      if (!profileData?.department_id) {
        toast.error("Your department is not set. Please contact an admin.");
        return;
      }

      const { data: coursesData, error } = await supabase
        .from("courses")
        .select("id, code, name")
        .eq("department_id", profileData.department_id)
        .eq("level", 100)
        .order("code");

      if (error) throw error;
      setCourses(coursesData || []);
    } catch (error) {
      console.error("Error loading courses:", error);
      toast.error("Failed to load courses");
    }
  };

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId);
    const course = courses.find((c) => c.id === courseId);
    if (course) {
      const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
      setTitle(`Lecture Notes — ${course.code} — ${today}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast.error("Only PDF files are allowed");
        return;
      }
      if (selectedFile.size > 26214400) {
        toast.error("File size must be less than 25MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!selectedCourse || !file || !title.trim()) {
      toast.error("Please fill all fields");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("courseId", selectedCourse);
      formData.append("title", title.trim());

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await supabase.functions.invoke("upload-lecture-note", {
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.error) throw response.error;

      setUploadSuccess(true);
      toast.success("Lecture note uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload lecture note");
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleShare = () => {
    const course = courses.find((c) => c.id === selectedCourse);
    const message = `📚 New Lecture Notes Available!\n\n${title}\n${course?.name}\n\nCheck it out on PDFNest!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (authLoading || repLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="container mx-auto max-w-2xl">
        <Button variant="ghost" onClick={() => navigate("/rep-dashboard")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Upload Lecture Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!uploadSuccess ? (
              <>
                {/* Step 1: Select Course */}
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <Select value={selectedCourse} onValueChange={handleCourseChange}>
                    <SelectTrigger id="course">
                      <SelectValue placeholder="Select a course" />
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

                {/* Step 2: Title */}
                {selectedCourse && (
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Lecture Notes — CSC101 — Nov 29"
                    />
                  </div>
                )}

                {/* Step 3: File Upload */}
                {selectedCourse && (
                  <div className="space-y-2">
                    <Label htmlFor="file">PDF File</Label>
                    <Input
                      id="file"
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                    />
                    {file && (
                      <p className="text-sm text-muted-foreground">
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                )}

                {/* Upload Progress */}
                {uploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} />
                    <p className="text-sm text-center text-muted-foreground">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}

                {/* Upload Button */}
                <Button
                  onClick={handleUpload}
                  disabled={!selectedCourse || !file || !title.trim() || uploading}
                  className="w-full"
                  size="lg"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Lecture Note"}
                </Button>
              </>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="text-6xl">🎉</div>
                <h3 className="text-2xl font-bold">Upload Successful!</h3>
                <p className="text-muted-foreground">
                  Your lecture note has been uploaded and is now available to students.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleShare} variant="outline">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share on WhatsApp
                  </Button>
                  <Button onClick={() => navigate("/rep-dashboard")}>
                    View Dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
