import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Trash2, FileText, Calendar, HardDrive, Mail, User, Search, Loader2, Activity } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getActivityDisplayName } from "@/lib/sessionLogger";

interface PDFFile {
  id: string;
  name: string;
  file_name: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  total_storage_used: number;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  details: any;
  created_at: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [pdfs, setPdfs] = useState<PDFFile[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "size">("date");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filteredPdfs = useMemo(() => {
    let filtered = pdfs.filter(pdf => 
      pdf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pdf.file_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return b.file_size - a.file_size;
        case "date":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [pdfs, searchQuery, sortBy]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin && userId) {
      fetchUserData();
    }
  }, [isAdmin, userId]);

  const fetchUserData = async () => {
    if (!userId) return;

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at, total_storage_used")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        toast.error("User not found");
        navigate("/admin");
        return;
      }

      setUser(profileData);

      // Fetch user's PDFs
      const { data: pdfData, error: pdfError } = await supabase
        .from("pdf_files")
        .select("id, name, file_name, file_size, storage_path, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (pdfError) throw pdfError;
      setPdfs(pdfData || []);

      // Fetch user's recent activity
      const { data: activityData, error: activityError } = await supabase
        .from("user_activity_logs")
        .select("id, activity_type, details, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!activityError) {
        setActivities(activityData || []);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (pdf: PDFFile) => {
    setDownloadingId(pdf.id);
    const toastId = toast.loading(`Preparing download for ${pdf.name}...`);
    
    try {
      // Download the file as blob
      const { data, error } = await supabase.storage
        .from("pdfs")
        .download(pdf.storage_path);

      if (error) {
        console.error("Storage error:", error);
        throw new Error(`Failed to download: ${error.message}`);
      }

      if (!data) {
        throw new Error("No data received from storage");
      }

      // Create blob URL
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // Create anchor and trigger download
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = pdf.file_name || `${pdf.name}.pdf`;
      
      // Append to body
      document.body.appendChild(a);
      
      // Click to start download
      a.click();
      
      // Clean up after a delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1500);

      toast.success(`Downloaded ${pdf.name}`, { id: toastId });
    } catch (error: any) {
      console.error("Error downloading file:", error);
      toast.error(error.message || "Failed to download file", { id: toastId });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (pdf: PDFFile) => {
    if (!confirm(`Are you sure you want to delete "${pdf.name}"?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from("pdfs")
        .remove([pdf.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("pdf_files")
        .delete()
        .eq("id", pdf.id);

      if (dbError) throw dbError;

      setPdfs(pdfs.filter(p => p.id !== pdf.id));
      toast.success("File deleted successfully");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  if (adminLoading || loading) {
    return <LoadingState message="Loading user data..." />;
  }

  if (!isAdmin || !user) {
    return null;
  }

  const displayName = user.full_name || user.email?.split('@')[0] || "Unknown User";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 pb-8">
      <PageHeader
        title={displayName}
        subtitle="User Details"
        showBack
        icon={<User className="h-6 w-6 text-primary" />}
      />

      <main className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">{formatDate(user.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total PDFs</p>
                  <p className="font-medium">{pdfs.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Storage Used</p>
                  <p className="font-medium">{formatBytes(user.total_storage_used || 0)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity ({activities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-8 w-8 text-muted-foreground" />}
                title="No activity recorded"
                description="This user has no activity logs yet."
              />
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {getActivityDisplayName(activity.activity_type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString()}
                        </span>
                      </div>
                      {activity.details && Object.keys(activity.details).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {activity.details.fileName || activity.details.page || JSON.stringify(activity.details).slice(0, 50)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PDFs List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Uploaded PDFs ({pdfs.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pdfs.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                title="No files uploaded"
                description="This user has not uploaded any PDFs yet."
              />
            ) : (
              <>
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search PDFs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "name" | "size")}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="size">Size</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filteredPdfs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No PDFs match your search</p>
                ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead className="text-right">Size</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPdfs.map((pdf, index) => (
                      <TableRow key={pdf.id}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {pdf.name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {formatDate(pdf.created_at)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatBytes(pdf.file_size)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(pdf)}
                              disabled={downloadingId === pdf.id}
                              title="Download"
                            >
                              {downloadingId === pdf.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(pdf)}
                              title="Delete"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="mt-auto py-6 border-t border-border/40">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground/60">
            Made with love ❤️ by Nexel
          </p>
        </div>
      </footer>
    </div>
  );
}
