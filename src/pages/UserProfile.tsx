import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, HardDrive, Calendar, Clock, Folder, Edit2, Building2, Check, Phone, User, GraduationCap } from "lucide-react";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EditProfileModal } from "@/components/EditProfileModal";
import { AdminBannerDisplay } from "@/components/AdminBannerDisplay";
import { ProfileSkeleton } from "@/components/ProfileSkeleton";
import { useDepartments } from "@/hooks/useDepartments";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

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
  phone_number: string | null;
  nickname: string | null;
  school: string | null;
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

const STORAGE_LIMIT = 300 * 1024 * 1024;
const PROFILE_CACHE_KEY = "pdfnest_profile_cache";

export default function UserProfile() {
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [savingDept, setSavingDept] = useState(false);
  const { departments } = useDepartments();

  const cachedProfile = useMemo(() => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY);
      if (cached) return JSON.parse(cached) as UserProfileData;
    } catch {}
    return null;
  }, []);

  const { data: profileData, isLoading, refetch } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return null;
      }

      // Fetch profile summary + extra fields in parallel
      const [summaryRes, extraRes] = await Promise.all([
        supabase.rpc("get_user_profile_summary", { p_user_id: user.id }),
        supabase.from("profiles").select("phone_number, nickname, school").eq("id", user.id).single(),
      ]);

      if (summaryRes.error) throw summaryRes.error;

      if (summaryRes.data && summaryRes.data.length > 0) {
        const summary = summaryRes.data[0];
        const extra = extraRes.data as any;
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
          phone_number: extra?.phone_number || null,
          nickname: extra?.nickname || null,
          school: extra?.school || null,
        };
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
        return profile;
      }
      return null;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: cachedProfile,
  });

  const profile = profileData || cachedProfile;
  const userId = profile?.id || null;

  const recentFiles = useMemo(() => {
    if (!userId) return [];
    try {
      const stored = localStorage.getItem(`recent-files-${userId}`);
      if (stored) return JSON.parse(stored) as RecentFile[];
    } catch {}
    return [];
  }, [userId]);

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
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
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

  if (isLoading && !profile) return <ProfileSkeleton />;

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
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">My Profile</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        <AdminBannerDisplay showOnProfile />

        {/* Department Banner */}
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
                    <p className="text-sm text-muted-foreground">Select your department to personalize your experience</p>
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
                  <Button onClick={handleSaveDepartment} disabled={!selectedDeptId || savingDept} size="icon" className="shrink-0">
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Card */}
        <Card className="overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/10" />
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left space-y-1.5 pb-1">
                <h2 className="text-2xl font-bold">{displayName}</h2>
                {profile.nickname && (
                  <p className="text-sm text-muted-foreground italic">"{profile.nickname}"</p>
                )}
                {profile.email && (
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                )}
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-1">
                  {profile.department_name && (
                    <Badge variant="secondary">
                      <Building2 className="w-3 h-3 mr-1" />
                      {profile.department_name}
                    </Badge>
                  )}
                  {profile.school && (
                    <Badge variant="outline">
                      <GraduationCap className="w-3 h-3 mr-1" />
                      {profile.school}
                    </Badge>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)} className="gap-2">
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Personal Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Personal Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Full Name", value: profile.full_name },
                { label: "Display Name", value: profile.display_name },
                { label: "Phone", value: profile.phone_number, icon: Phone },
                { label: "School", value: profile.school },
                { label: "Member since", value: profile.created_at ? format(new Date(profile.created_at), "MMM d, yyyy") : "N/A" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-right max-w-[60%] truncate">{item.value || "—"}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{profile.pdf_count}</p>
                  <p className="text-xs text-muted-foreground">Total PDFs</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{categories.length}</p>
                  <p className="text-xs text-muted-foreground">Categories</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Joined</span>
                <span className="font-medium ml-auto">
                  {profile.created_at ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: true }) : "N/A"}
                </span>
              </div>
            </CardContent>
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
              <span className="font-medium">{storagePercentage.toFixed(1)}%</span>
            </div>
            <Progress value={storagePercentage} className="h-2" />
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
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
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
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {userId && (
        <EditProfileModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          userId={userId}
          currentDisplayName={displayName}
          currentAvatarUrl={profile.avatar_url}
          currentDepartmentId={profile.department_id}
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
