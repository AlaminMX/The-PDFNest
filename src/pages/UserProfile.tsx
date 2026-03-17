import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { EditProfileModal } from "@/components/EditProfileModal";
import { AdminBannerDisplay } from "@/components/AdminBannerDisplay";
import { ProfileSkeleton } from "@/components/ProfileSkeleton";
import { ContributorStats } from "@/components/ContributorStats";
import { useDepartments } from "@/hooks/useDepartments";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, FileText, HardDrive, Calendar, Clock,
  Folder, Edit2, Building2, Check, ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  date_of_birth: string | null;
}

interface RecentFile { id: string; name: string; lastAccessed: number; }
interface Category { id: string; name: string; color: string; file_count?: number; }

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_LIMIT = 300 * 1024 * 1024;
const PROFILE_CACHE_KEY = "pdfnest_profile_cache";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null) {
  if (!name) return "U";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function fmtBytes(bytes: number | null) {
  if (!bytes) return "0 MB";
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function storagePercent(bytes: number | null) {
  if (!bytes) return 0;
  return Math.min((bytes / STORAGE_LIMIT) * 100, 100);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stat({ value, label, icon: Icon }: { value: string | number; label: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center gap-1 py-4 flex-1">
      <Icon className="w-4 h-4 text-muted-foreground/60 mb-0.5" />
      <span className="text-xl font-bold text-foreground">{value}</span>
      <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-1 mb-2">
      {children}
    </p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
      if (!user) { sessionStorage.setItem("redirectAfterLogin", "/profile"); navigate("/auth"); return null; }

      const { data, error } = await supabase.rpc("get_user_profile_summary", { p_user_id: user.id });
      if (error) throw error;

      if (data && data.length > 0) {
        const summary = data[0];
        const { data: extraData } = await supabase
          .from("profiles")
          .select("nickname, phone_number, date_of_birth")
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
          date_of_birth: (extraData as any)?.date_of_birth || null,
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
      toast.success("Department saved!");
      refetch();
    } catch {
      toast.error("Failed to save department");
    } finally {
      setSavingDept(false);
    }
  };

  if (isLoading && !profile) return <ProfileSkeleton />;
  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Profile not found.</p>
    </div>
  );

  const displayName = profile.display_name || profile.full_name || "User";
  const storageUsed = profile.total_storage_used || 0;
  const storagePct = storagePercent(storageUsed);

  // Storage bar colour: green → amber → red
  const storageColor = storagePct > 80 ? "bg-red-500" : storagePct > 60 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-10">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/30">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold text-base">Profile</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-5">
        <AdminBannerDisplay showOnProfile />

        {/* ── Hero card ── */}
        <div className="relative rounded-2xl bg-card border border-border/40 overflow-hidden">
          {/* Banner strip */}
          <div className="h-24 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent" />

          {/* Avatar + name */}
          <div className="px-5 pb-5 -mt-10">
            <div className="flex items-end justify-between gap-3">
              <div className="relative">
                <Avatar className="w-20 h-20 border-4 border-card shadow-md [&>img]:object-cover [&>img]:object-center">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-xl bg-primary text-primary-foreground font-bold">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mb-1 h-8 gap-1.5 text-xs rounded-full"
                onClick={() => setShowEditModal(true)}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </Button>
            </div>

            <div className="mt-3 space-y-1">
              <h1 className="text-xl font-bold leading-tight">{displayName}</h1>
              {profile.email && (
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {profile.department_name && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Building2 className="w-3 h-3" />
                    {profile.department_name}
                  </Badge>
                )}
                {profile.created_at && (
                  <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    Joined {format(new Date(profile.created_at), "MMM yyyy")}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="border-t border-border/30 flex divide-x divide-border/30">
            <Stat value={profile.pdf_count} label="PDFs" icon={FileText} />
            <Stat value={categories.length} label="Categories" icon={Folder} />
            <Stat value={fmtBytes(storageUsed)} label="Used" icon={HardDrive} />
          </div>
        </div>

        {/* ── Department prompt ── */}
        {!profile.department_id && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <p className="text-sm font-medium">Select your department</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Helps us show you relevant AFIT materials and courses.
            </p>
            <div className="flex gap-2">
              <Select value={selectedDeptId || ""} onValueChange={setSelectedDeptId}>
                <SelectTrigger className="flex-1 h-9 text-sm">
                  <SelectValue placeholder="Choose department…" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.icon && <span className="mr-1">{dept.icon}</span>}
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-9 px-3 shrink-0"
                onClick={handleSaveDepartment}
                disabled={!selectedDeptId || savingDept}
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Storage ── */}
        <div className="space-y-1.5">
          <SectionTitle>Storage</SectionTitle>
          <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{fmtBytes(storageUsed)} of 300 MB</span>
              <span className={`font-semibold tabular-nums ${storagePct > 80 ? "text-red-500" : storagePct > 60 ? "text-amber-500" : "text-foreground"}`}>
                {storagePct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${storageColor}`}
                style={{ width: `${storagePct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {fmtBytes(STORAGE_LIMIT - storageUsed)} remaining
            </p>
          </div>
        </div>

        {/* ── Contributor stats ── */}
        {userId && (
          <div className="space-y-1.5">
            <SectionTitle>Contributions</SectionTitle>
            <ContributorStats userId={userId} />
          </div>
        )}

        {/* ── Recent files ── */}
        <div className="space-y-1.5">
          <SectionTitle>Recently Accessed</SectionTitle>
          <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
            {recentFiles.length > 0 ? (
              <div className="divide-y divide-border/30">
                {recentFiles.map(file => (
                  <button
                    key={file.id}
                    onClick={() => navigate("/dashboard")}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(file.lastAccessed, { addSuffix: true })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center space-y-1">
                <Clock className="w-7 h-7 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">No recent files yet</p>
                <p className="text-xs text-muted-foreground/60">Files you view will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Categories ── */}
        <div className="space-y-1.5">
          <SectionTitle>Categories</SectionTitle>
          <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
            {categories.length > 0 ? (
              <div className="divide-y divide-border/30">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => navigate("/dashboard")}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="flex-1 text-sm font-medium truncate">{cat.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {cat.file_count} {cat.file_count === 1 ? "file" : "files"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center space-y-1">
                <Folder className="w-7 h-7 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">No categories yet</p>
                <p className="text-xs text-muted-foreground/60">Create categories to organise your PDFs</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Edit modal ── */}
      {userId && (
        <EditProfileModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          userId={userId}
          currentDisplayName={displayName}
          currentAvatarUrl={profile.avatar_url}
          currentDepartmentId={profile.department_id}
          currentPhoneNumber={profile.phone_number}
          currentFullName={profile.full_name}
          currentDateOfBirth={profile.date_of_birth}
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
