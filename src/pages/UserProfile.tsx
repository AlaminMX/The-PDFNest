import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, FileText, HardDrive, Calendar, Clock, Folder, Edit2, Building2 } from "lucide-react";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EditProfileModal } from "@/components/EditProfileModal";
import { AdminBannerDisplay } from "@/components/AdminBannerDisplay";
import { DepartmentSelectPrompt } from "@/components/DepartmentSelectPrompt";
import { format, formatDistanceToNow } from "date-fns";

interface UserProfileData {
  id: string;
  display_name: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  total_storage_used: number | null;
  created_at: string | null;
  department_id: string | null;
}

interface RecentFile {
  id: string;
  name: string;
  lastAccessed: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
  file_count?: number;
}

const STORAGE_LIMIT = 300 * 1024 * 1024; // 300MB

export default function UserProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [pdfCount, setPdfCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeptPrompt, setShowDeptPrompt] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      // Fetch profile with department
      const { data: profileData } = await supabase
        .from("profiles")
        .select(`
          id, display_name, full_name, email, avatar_url, total_storage_used, created_at, department_id,
          departments (name)
        `)
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setDepartmentName((profileData as any).departments?.name || null);
      }

      // Count PDFs
      const { count } = await supabase
        .from("pdf_files")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setPdfCount(count || 0);

      // Load recent files from localStorage
      const storedRecent = localStorage.getItem(`recent-files-${user.id}`);
      if (storedRecent) {
        try {
          setRecentFiles(JSON.parse(storedRecent));
        } catch (e) {
          console.error("Failed to parse recent files:", e);
        }
      }

      // Load categories with file counts
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, color")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (categoriesData) {
        // Get file counts for each category
        const categoriesWithCounts = await Promise.all(
          categoriesData.map(async (cat) => {
            const { count: fileCount } = await supabase
              .from("pdf_files")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("category_id", cat.id);
            return { ...cat, file_count: fileCount || 0 };
          })
        );
        setCategories(categoriesWithCounts);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatStorageSize = (bytes: number | null) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getStoragePercentage = (bytes: number | null) => {
    if (!bytes) return 0;
    return Math.min((bytes / STORAGE_LIMIT) * 100, 100);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDepartmentComplete = () => {
    setShowDeptPrompt(false);
    fetchUserProfile();
    // Clear department cache to update navigation dot
    localStorage.removeItem("pdfnest_dept_status");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-muted-foreground">Profile not found</div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.full_name || "User";
  const storageUsed = profile.total_storage_used || 0;
  const storagePercentage = getStoragePercentage(storageUsed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-24 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">My Profile</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Admin Banners for Profile */}
        <AdminBannerDisplay showOnProfile />

        {/* Department Banner - only show if no department */}
        {!profile.department_id && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Complete Your Profile</p>
                    <p className="text-sm text-muted-foreground">
                      Select your department to personalize your experience
                    </p>
                  </div>
                </div>
                <Button onClick={() => setShowDeptPrompt(true)}>
                  Select Department
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Card */}
        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/10" />
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-10">
              <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left space-y-1 pb-1">
                <h2 className="text-2xl font-bold">{displayName}</h2>
                {profile.email && (
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                )}
                {departmentName && (
                  <Badge variant="secondary" className="mt-1">
                    <Building2 className="w-3 h-3 mr-1" />
                    {departmentName}
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
                className="gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pdfCount}</p>
                <p className="text-xs text-muted-foreground">Total PDFs</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Folder className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {profile.created_at 
                    ? format(new Date(profile.created_at), "MMM d, yyyy")
                    : "N/A"
                  }
                </p>
                <p className="text-xs text-muted-foreground">Member since</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Storage Usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Storage Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatStorageSize(storageUsed)} of 300 MB used
              </span>
              <span className="font-medium">
                {storagePercentage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={storagePercentage} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              {formatStorageSize(STORAGE_LIMIT - storageUsed)} remaining
            </p>
          </CardContent>
        </Card>

        {/* Recent Files */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recently Accessed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentFiles.length > 0 ? (
              <div className="space-y-2">
                {recentFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate("/")}
                  >
                    <div className="p-2 rounded bg-primary/10">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(file.lastAccessed, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recently accessed files</p>
                <p className="text-xs mt-1">Your recent PDFs will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Your Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate("/")}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {category.file_count} {category.file_count === 1 ? "file" : "files"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No categories yet</p>
                <p className="text-xs mt-1">Create categories to organize your PDFs</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Profile Modal */}
      {userId && (
        <EditProfileModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          userId={userId}
          currentDisplayName={displayName}
          currentAvatarUrl={profile.avatar_url}
          currentDepartmentId={profile.department_id}
          onUpdateComplete={fetchUserProfile}
        />
      )}

      {/* Department Selection Prompt */}
      {userId && (
        <DepartmentSelectPrompt
          open={showDeptPrompt}
          onOpenChange={setShowDeptPrompt}
          userId={userId}
          onComplete={handleDepartmentComplete}
        />
      )}

      <SmartBottomNav />
    </div>
  );
}
