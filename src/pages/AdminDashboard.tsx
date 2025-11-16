import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Download, Eye, Trash2, Search, LogOut, Users, FileText, CheckCircle, LayoutList, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { PDFPreviewModal } from "@/components/PDFPreviewModal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface PDFFile {
  id: string;
  name: string;
  file_name: string;
  file_size: number;
  storage_path: string;
  created_at: string;
  user_id: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

interface UserWithPDFs {
  userId: string;
  email: string;
  displayName: string;
  fullName: string | null;
  pdfCount: number;
  pdfs: PDFFile[];
  createdAt: string;
}

function getUserDisplayName(email: string, fullName: string | null): string {
  if (fullName && fullName.trim()) {
    return fullName;
  }
  return email.split('@')[0];
}

function groupFilesByUser(files: PDFFile[]): UserWithPDFs[] {
  const userMap = new Map<string, UserWithPDFs>();
  
  files.forEach(file => {
    const userId = file.user_id;
    const email = file.profiles?.email || "Unknown";
    const fullName = file.profiles?.full_name || null;
    
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        userId,
        email,
        displayName: getUserDisplayName(email, fullName),
        fullName,
        pdfCount: 0,
        pdfs: [],
        createdAt: file.created_at
      });
    }
    
    const userData = userMap.get(userId)!;
    userData.pdfs.push(file);
    userData.pdfCount++;
  });
  
  return Array.from(userMap.values()).sort((a, b) => 
    a.displayName.localeCompare(b.displayName)
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllFiles();
    }
  }, [isAdmin]);

  const fetchAllFiles = async () => {
    try {
      const { data, error } = await supabase
        .from("pdf_files")
        .select(`
          *,
          profiles (
            email,
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFiles(data || []);

      const uniqueUsers = new Set(data?.map(f => f.user_id) || []);
      setActiveUsers(uniqueUsers.size);

      const { count, error: countError } = await supabase
        .from("profiles")
        .select("*", { count: 'exact', head: true });

      if (!countError) {
        setTotalUsers(count || 0);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (file: PDFFile) => {
    try {
      const { data, error } = await supabase.storage
        .from("pdfs")
        .createSignedUrl(file.storage_path, 3600);

      if (error) throw error;
      setPreviewFile({ url: data.signedUrl, name: file.name });
    } catch (error) {
      console.error("Error previewing file:", error);
      toast.error("Failed to preview file");
    }
  };

  const handleDownload = async (file: PDFFile) => {
    try {
      const { data, error } = await supabase.storage
        .from("pdfs")
        .download(file.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("File downloaded successfully");
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  const handleDelete = async (file: PDFFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from("pdfs")
        .remove([file.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("pdf_files")
        .delete()
        .eq("id", file.id);

      if (dbError) throw dbError;

      setFiles(files.filter((f) => f.id !== file.id));
      toast.success("File deleted successfully");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const filteredFiles = files.filter(
    (file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.profiles?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getUserDisplayName(file.profiles?.email || "", file.profiles?.full_name || null).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedUsers = groupFilesByUser(filteredFiles);
  const filteredGroupedUsers = groupedUsers.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.pdfs.some(pdf => 
      pdf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pdf.file_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage all user PDFs</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="icon" onClick={handleSignOut} title="Sign Out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total PDFs</p>
                <p className="text-2xl font-bold">{files.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{activeUsers}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users, files, or emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grouped' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grouped')}
              className="gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              Grouped by User
            </Button>
            <Button
              variant={viewMode === 'flat' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('flat')}
              className="gap-2"
            >
              <LayoutList className="h-4 w-4" />
              All Files
            </Button>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No files uploaded yet</p>
          </div>
        ) : viewMode === 'grouped' ? (
          <Accordion type="multiple" className="space-y-4">
            {filteredGroupedUsers.map((userData) => (
              <AccordionItem 
                key={userData.userId} 
                value={userData.userId}
                className="border border-border rounded-lg bg-card overflow-hidden"
              >
                <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-foreground">{userData.displayName}</p>
                        {userData.displayName !== userData.email && (
                          <p className="text-sm text-muted-foreground">{userData.email}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary">{userData.pdfCount} PDF{userData.pdfCount !== 1 ? 's' : ''}</Badge>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="px-6 pb-4">
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Name</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">File Name</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Size</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Date</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userData.pdfs.map((file) => (
                          <tr key={file.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="p-3">{file.name}</td>
                            <td className="p-3 text-muted-foreground text-sm">{file.file_name}</td>
                            <td className="p-3 text-muted-foreground text-sm">
                              {(file.file_size / 1024 / 1024).toFixed(2)} MB
                            </td>
                            <td className="p-3 text-muted-foreground text-sm">
                              {new Date(file.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handlePreview(file)} title="Preview">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDownload(file)} title="Download">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(file)} title="Delete">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden space-y-3">
                    {userData.pdfs.map((file) => (
                      <div key={file.id} className="p-4 border border-border/50 rounded-lg bg-background">
                        <div className="space-y-2">
                          <div>
                            <h4 className="font-medium">{file.name}</h4>
                            <p className="text-sm text-muted-foreground">{file.file_name}</p>
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Size: {(file.file_size / 1024 / 1024).toFixed(2)} MB</p>
                            <p>Date: {new Date(file.created_at).toLocaleDateString()}</p>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => handlePreview(file)} className="flex-1">
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDownload(file)} className="flex-1">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(file)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto border border-border rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 font-semibold text-sm">Name</th>
                    <th className="text-left p-4 font-semibold text-sm">File Name</th>
                    <th className="text-left p-4 font-semibold text-sm">Size</th>
                    <th className="text-left p-4 font-semibold text-sm">User</th>
                    <th className="text-left p-4 font-semibold text-sm">Date</th>
                    <th className="text-left p-4 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-4">{file.name}</td>
                      <td className="p-4 text-muted-foreground">{file.file_name}</td>
                      <td className="p-4 text-muted-foreground">
                        {(file.file_size / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-sm">
                            {getUserDisplayName(file.profiles?.email || "", file.profiles?.full_name || null)}
                          </p>
                          <p className="text-xs text-muted-foreground">{file.profiles?.email}</p>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(file.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handlePreview(file)} title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(file)} title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(file)} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {filteredFiles.map((file) => (
                <Card key={file.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{file.name}</h3>
                        <p className="text-sm text-muted-foreground">{file.file_name}</p>
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Size: {(file.file_size / 1024 / 1024).toFixed(2)} MB</p>
                      <p>
                        User: <span className="font-medium text-foreground">
                          {getUserDisplayName(file.profiles?.email || "", file.profiles?.full_name || null)}
                        </span>
                      </p>
                      <p className="text-xs">{file.profiles?.email}</p>
                      <p>Date: {new Date(file.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => handlePreview(file)} className="flex-1">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownload(file)} className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(file)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {previewFile && (
        <PDFPreviewModal
          isOpen={!!previewFile}
          pdfUrl={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
