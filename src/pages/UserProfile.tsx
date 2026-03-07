import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, HardDrive, Calendar, Clock, Folder, Edit2, Building2, Check } from "lucide-react";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EditProfileModal } from "@/components/EditProfileModal";
import { AdminBannerDisplay } from "@/components/AdminBannerDisplay";
import { ProfileSkeleton } from "@/components/ProfileSkeleton";
import { useDepartments } from "@/hooks/useDepartments";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface UserProfileData {
  id: string;
  display_name: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  total_storage_used: number | null;
  created_at: string | null;
  department_id: string | null;
  department_name: string | null;
  pdf_count: number;
  nickname: string | null;
  phone_number: string | null;
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

// Cache key for localStorage
const PROFILE_CACHE_KEY = "pdfnest_profile_cache";

export default function UserProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [savingDept, setSavingDept] = useState(false);
  const { departments } = useDepartments();

  // Get cached profile from localStorage for instant render
  const cachedProfile = useMemo(() => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY);
      if (cached) return JSON.parse(cached) as UserProfileData;
    } catch {}
    return null;
  }, []);

  // Fetch profile with React Query for caching and background revalidation
  const { data: profileData, isLoading, refetch } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return null;
      }

      const { data, error } = await supabase
        .rpc("get_user_profile_summary", { p_user_id: user.id });

      if (error) throw error;

      if (data && data.length > 0) {
        const summary = data[0];
        
        // Also fetch extra fields not in the RPC
        const { data: extraData } = await supabase
          .from("profiles")
          .select("nickname, phone_number")
          .eq("id", user.id)
          .maybeSingle();

        const profile: UserProfileData = {
          id: summary.id,
          display_name: summary.display_name,
          full_name: summary.full_name,
          email: summary.email,
          avatar_url: summary.avatar_url,
          total_storage_used: summary.total_storage_used,
          created_at: summary.created_at,
          department_id: summary.department_id,
          department_name: summary.department_name,
          pdf_count: Number(summary.pdf_count),
          nickname: extraData?.nickname || null,
          phone_number: extraData?.phone_number || null,
        };
        
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
        return profile;
      }
      return null;
    },
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000, // 5 minutes
    placeholderData: cachedProfile,
  });

  // Use fetched data or cached data
  const profile = profileData || cachedProfile;
  const userId = profile?.id || null;

  // Fetch recent files from localStorage (instant)
  const recentFiles = useMemo(() => {
    if (!userId) return [];
    try {
      const stored = localStorage.getItem(`recent-files-${userId}`);
      if (stored) return JSON.parse(stored) as RecentFile[];
    } catch {}
    return [];
  }, [userId]);

  // Fetch categories with React Query
  const { data: categories = [] } = useQuery({
    queryKey: ["user-categories", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, color")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (!categoriesData) return [];

      // Get file counts in parallel
      const categoriesWithCounts = await Promise.all(
        categoriesData.map(async (cat) => {
          const { count } = await supabase
            .from("pdf_files")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("category_id", cat.id);
          return { ...cat, file_count: count || 0 };
        })
      );
      return categoriesWithCounts as Category[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

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

  const handleSaveDepartment = async () => {
    if (!selectedDeptId || !userId) return;
    
    setSavingDept(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ department_id: selectedDeptId })
        .eq("id", userId);

      if (error) throw error;

      // Clear department cache to update navigation dot
      localStorage.removeItem("pdfnest_dept_status");
      localStorage.removeItem(PROFILE_CACHE_KEY);
      
      toast.success("Department saved successfully!");
      refetch();
    } catch (error) {
      console.error("Error saving department:", error);
      toast.error("Failed to save department");
    } finally {
      setSavingDept(false);
    }
  };

  // Show skeleton immediately if no cached data
  if (isLoading && !profile) {
    return <ProfileSkeleton />;
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
  const departmentName = profile.department_name;
  const pdfCount = profile.pdf_count;

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
          <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent overflow-hidden">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Complete Your Profile</p>
                    <p className="text-sm text-muted-foreground">
                      Select your department to personalize your experience
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Select value={selectedDeptId || ""} onValueChange={setSelectedDeptId}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.icon && <span className="mr-1">{dept.icon}</span>}
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleSaveDepartment} 
                    disabled={!selectedDeptId || savingDept}
                    size="icon"
                    className="shrink-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
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
          currentNickname={profile.nickname}
          currentPhoneNumber={profile.phone_number}
          currentFullName={profile.full_name}
          onUpdateComplete={() => {
            localStorage.removeItem(PROFILE_CACHE_KEY);
            refetch();
          }}
        />
      )}


      <SmartBottomNav />
    </div>
  );
}
