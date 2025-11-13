import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Eye, Trash2, Search, LogOut } from "lucide-react";
import { toast } from "sonner";
import { PDFPreviewModal } from "@/components/PDFPreviewModal";

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
  };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

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
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFiles(data || []);
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

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage all user PDFs</p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by file name or user email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Upload Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No files found
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {file.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {file.profiles?.email || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {(file.file_size / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(file.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreview(file)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(file)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(file)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {previewFile && (
        <PDFPreviewModal
          pdfUrl={previewFile.url}
          fileName={previewFile.name}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
