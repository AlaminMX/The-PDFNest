import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useRepStatus } from "@/hooks/useRepStatus";
import { usePDFFiles } from "@/hooks/usePDFFiles";
import { useCategories } from "@/hooks/useCategories";
import { useDownloadManager } from "@/hooks/useDownloadManager";
import { uploadManager } from "@/lib/uploadManager";
import { NavLink, useNavigate } from "react-router-dom";
import { logActivity } from "@/lib/sessionLogger";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { InstallPWA } from "@/components/InstallPWA";
import { Link } from "react-router-dom";
import { Shield, MoreVertical, Plus, Trash2, LogOut, HelpCircle, Folder, LayoutGrid, LayoutList, FileText, Download, Edit2, Check, Star, X, Sparkles, BookOpen, Volume2, Languages, MessageSquare, GraduationCap, Upload, Users, WifiOff, CloudDownload, CheckCircle, Tag } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger } from
"@/components/ui/collapsible";
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarTrigger,
  useSidebar } from
"@/components/ui/sidebar";
import { PDFViewer } from "@/components/PDFViewer";
import { NavigationTutorial } from "@/components/NavigationTutorial";
import { StorageIndicator } from "@/components/StorageIndicator";
import { PDFSummaryModal } from "@/components/PDFSummaryModal";
import { StudyGuideModal } from "@/components/StudyGuideModal";
import { PDFAudioPlayer } from "@/components/PDFAudioPlayer";
import { TranslatorModal } from "@/components/TranslatorModal";
import { PDFChatInterface } from "@/components/PDFChatInterface";
import { FilePicker } from "@/components/FilePicker";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { GettingStartedChecklist } from "@/components/GettingStartedChecklist";
import { DownloadProgress } from "@/components/DownloadProgress";
import { AdminBannerDisplay } from "@/components/AdminBannerDisplay";
import { SparkleBackground } from "@/components/SparkleBackground";


function DesktopHeaderNav() {
  const baseLinkClass =
  "px-3 py-2 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

  return (
    <nav aria-label="Desktop navigation" className="hidden lg:flex items-center gap-1 ml-6">
      <NavLink
        to="/profile"
        className={({ isActive }) =>
        `${baseLinkClass} ${
        isActive ?
        "text-primary bg-primary/10" :
        "text-muted-foreground hover:text-foreground hover:bg-muted"}`

        }>
        
        Profile
      </NavLink>
      <NavLink
        to="/ai-features"
        className={({ isActive }) =>
        `${baseLinkClass} ${
        isActive ?
        "text-primary bg-primary/10" :
        "text-muted-foreground hover:text-foreground hover:bg-muted"}`

        }>
        
        AI Features
      </NavLink>
    </nav>);

}

type SortOption = "name" | "date" | "size";
type SortOrder = "asc" | "desc";
export type AIModalType = 'summary' | 'study-guide' | 'voice' | 'translate' | 'chat' | null;

interface RecentFile {
  id: string;
  name: string;
  lastAccessed: number;
}

function AppSidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  files,
  newCategoryName,
  onNewCategoryNameChange,
  onAddCategory,
  onDeleteCategory,
  isAdmin,
  isRep,
  repUserId,
  onSignOut,
  onOpenTutorial,
  storageUsed,
  onOpenAIFeature,
  recentFiles,
  onOpenRecentFile


















}: {categories: any[];selectedCategory: string;onSelectCategory: (id: string) => void;files: any[];newCategoryName: string;onNewCategoryNameChange: (name: string) => void;onAddCategory: () => void;onDeleteCategory: (id: string) => void;isAdmin: boolean;isRep: boolean;repUserId: string | undefined;onSignOut: () => void;onOpenTutorial: () => void;storageUsed: number;onOpenAIFeature: (featureType: AIModalType) => void;recentFiles: RecentFile[];onOpenRecentFile: (fileId: string) => void;}) {
  const { open, isMobile, setOpenMobile } = useSidebar();

  const handleCategoryClick = (id: string) => {
    onSelectCategory(id);
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [aiSectionOpen, setAiSectionOpen] = useState(true);
  const [filesSectionOpen, setFilesSectionOpen] = useState(false);
  const [recentSectionOpen, setRecentSectionOpen] = useState(false);
  const [categoriesSectionOpen, setCategoriesSectionOpen] = useState(true);

  const handleAddCategoryLocal = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    onAddCategory();
    setShowNewCategoryForm(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground">
      {/* Header with subtle gradient accent */}
      <SidebarHeader className="pb-0">
        <div className="flex items-center gap-3 px-3 py-4">
          <div className="relative">
            <img src="/pdfnest-logo.png" alt="PDFNest Logo" className="size-10 rounded-xl shadow-md object-contain ring-1 ring-border/30" />
            <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-white rounded-full border-2 border-sidebar-background" />
          </div>
          {open &&
          <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-bold text-base tracking-tight">PDFNest</span>
              <span className="text-[11px] text-sidebar-foreground/70">Smart PDF Manager</span>
            </div>
          }
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2 gap-1 overflow-y-auto">
        {/* AI Features Section */}
        {/* Separator */}
        <div className="mx-4 h-px bg-sidebar-border" />

        {/* AFIT Resources */}
        <SidebarGroup className="py-2">
          <SidebarGroupLabel className="px-3 py-2.5 flex items-center gap-3">
            <div className="size-7 rounded-lg bg-sidebar-accent flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-sidebar-foreground" />
            </div>
            <span className="font-semibold text-[11px] uppercase tracking-widest text-sidebar-foreground/80">Resources</span>
          </SidebarGroupLabel>
          <SidebarGroupContent className="pl-1">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="py-2.5 px-3 rounded-lg transition-all duration-150 hover:translate-x-0.5">
                  <Link to="/afit-pdfs">
                    <Folder className="w-[18px] h-[18px] text-sidebar-foreground shrink-0" />
                    {open && <span className="text-[13px] ml-0.5">AFIT PDFs</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin &&
        <>
            <div className="mx-4 h-px bg-sidebar-border" />
            <SidebarGroup className="py-2">
              <SidebarGroupLabel className="px-3 py-2.5 flex items-center gap-3">
                <div className="size-7 rounded-lg bg-sidebar-accent flex items-center justify-center">
                  <Shield className="w-4 h-4 text-sidebar-foreground" />
                </div>
                <span className="font-semibold text-[11px] uppercase tracking-widest text-sidebar-foreground/80">Admin Tools</span>
              </SidebarGroupLabel>
              <SidebarGroupContent className="pl-1">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="py-2.5 px-3 rounded-lg transition-all duration-150 hover:translate-x-0.5">
                      <Link to="/admin/reps">
                        <Users className="w-[18px] h-[18px] text-sidebar-foreground shrink-0" />
                        {open && <span className="text-[13px] ml-0.5">Reps Profile</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        }

        {/* Separator */}
        <div className="mx-4 h-px bg-sidebar-border" />

        {/* Recent Files */}
        <Collapsible open={recentSectionOpen} onOpenChange={setRecentSectionOpen}>
          <SidebarGroup className="py-2">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-lg px-3 py-2.5 transition-all duration-200 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="size-7 rounded-lg bg-sidebar-accent flex items-center justify-center">
                    <FileText className="w-4 h-4 text-sidebar-foreground/80" />
                  </div>
                  <span className="font-semibold text-[11px] uppercase tracking-widest text-sidebar-foreground/80">Recent Files</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-sidebar-foreground/60 transition-transform duration-200 ${recentSectionOpen ? 'rotate-180' : ''}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent className="mt-1.5 pl-1">
                <SidebarMenu>
                  {recentFiles.length === 0 ?
                  <SidebarMenuItem>
                      <div className="px-3 py-4 text-center">
                        <FileText className="w-8 h-8 text-sidebar-foreground/30 mx-auto mb-2" />
                        <span className="text-[11px] text-sidebar-foreground/60">No recent files yet</span>
                      </div>
                    </SidebarMenuItem> :

                  recentFiles.map((file) =>
                  <SidebarMenuItem key={file.id}>
                        <SidebarMenuButton onClick={() => onOpenRecentFile(file.id)} className="py-2 px-3 rounded-lg transition-all duration-150 hover:translate-x-0.5">
                          <FileText className="w-4 h-4 text-sidebar-foreground/80 shrink-0" />
                          <span className="truncate text-[13px]">{file.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                  )
                  }
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Separator */}
        <div className="mx-4 h-px bg-sidebar-border" />

        {/* Favorites */}
        <SidebarGroup className="py-1">
          <SidebarGroupContent className="pl-1">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={selectedCategory === "favorites"}
                  onClick={() => handleCategoryClick("favorites")}
                  className="py-2.5 px-3 rounded-lg transition-all duration-150">
                  
                  <Star className="w-[18px] h-[18px] text-[hsl(var(--chart-4))] shrink-0" />
                  <span className="text-[13px] ml-0.5 font-medium">Favorites</span>
                  {open &&
                  <span className="ml-auto text-[11px] font-medium bg-sidebar-accent text-sidebar-foreground px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
                      {files.filter((f) => f.is_favorite).length}
                    </span>
                  }
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Separator */}
        <div className="mx-4 h-px bg-sidebar-border" />

        {/* Files Section */}
        <Collapsible open={filesSectionOpen} onOpenChange={setFilesSectionOpen}>
          <SidebarGroup className="py-2">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-lg px-3 py-2.5 transition-all duration-200 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="size-7 rounded-lg bg-sidebar-accent flex items-center justify-center">
                    <Folder className="w-4 h-4 text-sidebar-foreground/80" />
                  </div>
                  <span className="font-bold text-xs uppercase tracking-wider text-sidebar-foreground">Files</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-sidebar-foreground/60 transition-transform duration-200 ${filesSectionOpen ? 'rotate-180' : ''}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent className="mt-1.5 pl-1">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={selectedCategory === "all"}
                      onClick={() => handleCategoryClick("all")}
                      className="py-2.5 px-3 rounded-lg transition-all duration-150">
                      
                      <Folder className="w-[18px] h-[18px] shrink-0" />
                      <span className="text-[13px] ml-0.5">All Files</span>
                      {open &&
                      <span className="ml-auto text-[11px] font-medium bg-sidebar-accent text-sidebar-foreground px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
                          {files.length}
                        </span>
                      }
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Separator */}
        <div className="mx-4 h-px bg-sidebar-border" />

        {/* Categories Section */}
        <Collapsible open={categoriesSectionOpen} onOpenChange={setCategoriesSectionOpen}>
          <SidebarGroup className="py-2">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-lg px-3 py-2.5 transition-all duration-200 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="size-7 rounded-lg bg-sidebar-accent flex items-center justify-center">
                    <Tag className="w-4 h-4 text-sidebar-foreground/80" />
                  </div>
                  <span className="font-medium text-[11px] uppercase tracking-widest text-sidebar-foreground/80">Categories</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-sidebar-foreground/60 transition-transform duration-200 ${categoriesSectionOpen ? 'rotate-180' : ''}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent className="mt-1.5 pl-1">
                <SidebarMenu>
                  {categories.filter((c) => c.id !== "favorites").map((category) => {
                    const count = files.filter((f) =>
                    category.id === "uncategorized" ? !f.category_id :
                    f.category_id === category.id
                    ).length;

                    return (
                      <SidebarMenuItem key={category.id}>
                        <SidebarMenuButton
                          isActive={selectedCategory === category.id}
                          onClick={() => handleCategoryClick(category.id)}
                          className="py-2 px-3 rounded-lg transition-all duration-150">
                          
                          <Folder className="w-[16px] h-[16px] shrink-0" />
                          <span className="truncate text-[13px] ml-0.5">{category.name}</span>
                          {open && count > 0 &&
                          <span className="ml-auto text-[11px] font-medium bg-sidebar-accent text-sidebar-foreground px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
                              {count}
                            </span>
                          }
                        </SidebarMenuButton>
                        {category.id !== "uncategorized" &&
                        <SidebarMenuAction onClick={() => onDeleteCategory(category.id)} className="opacity-0 group-hover/menu-item:opacity-100 transition-opacity">
                            <Trash2 className="w-3.5 h-3.5" />
                          </SidebarMenuAction>
                        }
                      </SidebarMenuItem>);

                  })}
                </SidebarMenu>
              </SidebarGroupContent>
              
              <SidebarGroupContent className="mt-2 px-1">
                {!showNewCategoryForm ?
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground border border-dashed border-sidebar-border hover:border-sidebar-foreground/50 transition-colors"
                  onClick={() => setShowNewCategoryForm(true)}>
                  
                    <Plus className="w-4 h-4 mr-2" />
                    {open && <span className="text-sm">New Category</span>}
                  </Button> :

                <div className="space-y-2 p-2 bg-sidebar-accent rounded-lg border border-sidebar-border">
                    <Input
                    value={newCategoryName}
                    onChange={(e) => onNewCategoryNameChange(e.target.value)}
                    placeholder="Category name"
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCategoryLocal();
                      if (e.key === "Escape") {
                        onNewCategoryNameChange("");
                        setShowNewCategoryForm(false);
                      }
                    }}
                    autoFocus />
                  
                    <div className="flex gap-1.5">
                      <Button
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={handleAddCategoryLocal}>
                      
                        Create
                      </Button>
                      <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => {
                        onNewCategoryNameChange("");
                        setShowNewCategoryForm(false);
                      }}>
                      
                        Cancel
                      </Button>
                    </div>
                  </div>
                }
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
      
      <SidebarFooter className="px-2 pb-4 pt-2">
        <div id="storage-indicator">
          <StorageIndicator storageUsed={storageUsed} />
        </div>
        <div className="mx-3 my-2 h-px bg-sidebar-border" />
        <SidebarMenu className="space-y-0.5">
          {isRep &&
          <>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="py-2.5 px-3 rounded-lg transition-all duration-150 hover:translate-x-0.5">
                  <Link to="/rep/upload">
                    <Upload className="w-[18px] h-[18px] text-sidebar-foreground shrink-0" />
                    {open && <span className="text-[13px] ml-0.5">Upload Lecture Notes</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="py-2.5 px-3 rounded-lg transition-all duration-150 hover:translate-x-0.5">
                  <Link to={`/rep/${repUserId}`}>
                    <Users className="w-[18px] h-[18px] text-sidebar-foreground shrink-0" />
                    {open && <span className="text-[13px] ml-0.5">My Profile</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          }
          
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onOpenTutorial} className="py-2.5 px-3 rounded-lg transition-all duration-150 hover:translate-x-0.5">
              <HelpCircle className="w-[18px] h-[18px] text-sidebar-foreground shrink-0" />
              {open && <span className="text-[13px] ml-0.5 text-sidebar-foreground">Help & Tutorial</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {isAdmin &&
          <SidebarMenuItem>
              <SidebarMenuButton asChild className="py-2.5 px-3 rounded-lg transition-all duration-150 hover:translate-x-0.5">
                <Link to="/admin">
                  <Shield className="w-[18px] h-[18px] text-sidebar-foreground shrink-0" />
                  {open && <span className="text-[13px] ml-0.5">Admin Dashboard</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          }
          
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onSignOut} className="py-2.5 px-3 rounded-lg transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <LogOut className="w-[18px] h-[18px] shrink-0" />
              {open && <span className="text-[13px] ml-0.5">Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>);

}

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const { isRep, loading: repLoading } = useRepStatus();
  const { files, loading: filesLoading, uploadFile, deleteFile, updateFileCategory, renameFile, toggleFavorite, uploadProgress, cancelUpload, retryUpload, refreshFiles, hasMore, loadMore, cacheForOffline } = usePDFFiles(user?.id);
  const { categories, addCategory, deleteCategory } = useCategories(user?.id);
  const { downloads, downloadFile, downloadMultiple, cancelDownload, clearCompleted } = useDownloadManager();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { data: profileStorageUsed } = useQuery({
    queryKey: ["user-storage", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data } = await supabase.from("profiles").select("total_storage_used").eq("id", user.id).maybeSingle();
      return data?.total_storage_used || 0;
    },
    enabled: !!user?.id
  });

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [previewPdf, setPreviewPdf] = useState<{url: string;name: string;fileSize?: number;fileId?: string;createdAt?: string;thumbnailUrl?: string | null;} | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"delete" | "move" | null>(null);
  const [bulkMoveCategory, setBulkMoveCategory] = useState<string>("");
  const [showTutorial, setShowTutorial] = useState(!localStorage.getItem("tutorial-completed"));
  const [viewMode, setViewMode] = useState<"list" | "grid">(
    () => localStorage.getItem("pdfnest-view-mode") as "list" | "grid" || "grid"
  );
  const [activeAIModal, setActiveAIModal] = useState<AIModalType>(null);
  const [selectedFileForAI, setSelectedFileForAI] = useState<{id: string;name: string;} | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [pendingAIFeature, setPendingAIFeature] = useState<AIModalType>(null);
  const [showChecklist, setShowChecklist] = useState(() => {
    if (!user?.id) return false;
    return !localStorage.getItem(`checklist-dismissed-${user?.id}`);
  });
  const [completedChecklistItems, setCompletedChecklistItems] = useState<string[]>([]);
  const [showViewHint, setShowViewHint] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);

  const categoryColors = [
  'bg-red-100 text-red-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-yellow-100 text-yellow-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700'];


  useEffect(() => {
    if (!user?.id) return;
    try {
      const stored = localStorage.getItem(`recent-files-${user.id}`);
      if (!stored) return;
      const parsed: RecentFile[] = JSON.parse(stored);
      const valid = parsed.filter((item) =>
      files.some((file) => file.id === item.id)
      );
      valid.sort((a, b) => b.lastAccessed - a.lastAccessed);
      setRecentFiles(valid.slice(0, 5));
    } catch (error) {
      console.error("Failed to load recent files:", error);
    }
  }, [user?.id, files]);

  // One-time view mode hint
  useEffect(() => {
    if (!user?.id) return;
    const hintKey = `pdfnest-view-hint-${user.id}`;
    if (localStorage.getItem(hintKey)) return;
    const timer = setTimeout(() => {
      setShowViewHint(true);
      localStorage.setItem(hintKey, "true");
    }, 2000);
    return () => clearTimeout(timer);
  }, [user?.id]);

  // Online/offline listener
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Persist viewMode to localStorage
  useEffect(() => {
    localStorage.setItem("pdfnest-view-mode", viewMode);
  }, [viewMode]);

  // Track completed checklist items
  useEffect(() => {
    if (!user?.id) return;
    const completed: string[] = [];
    if (files.length > 0) completed.push('upload');
    if (categories.filter((c) => c.id !== 'uncategorized' && c.id !== 'favorites').length > 0) completed.push('category');
    if (files.some((f) => f.is_favorite)) completed.push('favorite');
    // Check if user has used AI features (stored in localStorage)
    if (localStorage.getItem(`ai-used-${user.id}`)) completed.push('ai');
    setCompletedChecklistItems(completed);
  }, [user?.id, files, categories]);

  // Redirect reps to their profile page on first visit
  useEffect(() => {
    if (!authLoading && !repLoading && isRep && user?.id) {
      const hasVisited = localStorage.getItem(`rep-visited-${user.id}`);
      if (!hasVisited) {
        localStorage.setItem(`rep-visited-${user.id}`, 'true');
        navigate(`/rep/${user.id}`);
      }
    }
  }, [authLoading, repLoading, isRep, user?.id, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading your workspace...</p>
        </div>
      </div>);

  }

  if (!user) {
    // Auth state settled but no user - redirect to login
    // Using window.location to avoid stale navigate closure issues
    window.location.replace("/auth");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const pdfFiles = Array.from(selectedFiles).filter(
      (file) => file.type === "application/pdf"
    );

    if (pdfFiles.length === 0) {
      toast.error("Please select PDF files only");
      return;
    }

    // Use upload manager for batch uploads
    uploadManager.addFiles(pdfFiles, selectedCategory === "all" ? null : selectedCategory);
    e.target.value = "";
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    const randomColor = categoryColors[Math.floor(Math.random() * categoryColors.length)];
    await addCategory(newCategoryName.trim(), randomColor);
    setNewCategoryName("");
  };

  const handleOpenAIFeature = (featureType: AIModalType) => {
    if (files.length === 0) {
      toast.error("Please upload a PDF file first");
      return;
    }
    setPendingAIFeature(featureType);
    setShowFilePicker(true);
  };

  const trackRecentFile = (fileId: string, fileName: string) => {
    if (!user?.id) return;
    setRecentFiles((prev) => {
      const now = Date.now();
      const existing = prev.filter((item) => item.id !== fileId);
      const updated = [{ id: fileId, name: fileName, lastAccessed: now }, ...existing];
      updated.sort((a, b) => b.lastAccessed - a.lastAccessed);
      const sliced = updated.slice(0, 5);
      localStorage.setItem(`recent-files-${user.id}`, JSON.stringify(sliced));
      return sliced;
    });
  };

  const handleFileSelected = (fileId: string, fileName: string) => {
    setSelectedFileForAI({ id: fileId, name: fileName });
    setActiveAIModal(pendingAIFeature);
    setShowFilePicker(false);
    setPendingAIFeature(null);
    trackRecentFile(fileId, fileName);
    // Mark AI feature as used for checklist
    if (user?.id) {
      localStorage.setItem(`ai-used-${user.id}`, 'true');
    }
  };

  const handleOpenPreview = async (file: any) => {
    if (!file.url && !file.isOfflineAvailable) return;

    let previewUrl = file.url || '';

    // For offline files or when offline, try to get cached blob
    if (file.isOfflineAvailable && (!file.url || !navigator.onLine)) {
      try {
        const { getCachedPDF } = await import("@/lib/offlineStorage");
        const blob = await getCachedPDF(file.id);
        if (blob) {
          previewUrl = URL.createObjectURL(blob);
        }
      } catch (err) {
        console.error("Error loading cached PDF:", err);
      }
    }

    setPreviewPdf({
      url: previewUrl,
      name: file.name,
      fileSize: file.file_size,
      fileId: file.id,
      createdAt: file.created_at,
      thumbnailUrl: file.thumbnail_url
    });
    trackRecentFile(file.id, file.name);
    logActivity("view_pdf", { fileName: file.name, fileId: file.id });
  };

  const handleOpenRecentFile = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file) {
      handleOpenPreview(file);
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    setCategoryToDelete(categoryId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (categoryToDelete) {
      await deleteCategory(categoryToDelete);
      setCategoryToDelete(null);
      setDeleteDialogOpen(false);
      if (selectedCategory === categoryToDelete) {
        setSelectedCategory("all");
      }
    }
  };

  const handleStartEdit = (fileId: string, fileName: string) => {
    setEditingFileId(fileId);
    setEditingFileName(fileName);
  };

  const handleSaveEdit = async () => {
    if (editingFileId && editingFileName.trim()) {
      await renameFile(editingFileId, editingFileName.trim());
      setEditingFileId(null);
      setEditingFileName("");
    }
  };

  const handleCancelEdit = () => {
    setEditingFileId(null);
    setEditingFileName("");
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === sortedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(sortedFiles.map((f) => f.id)));
    }
  };

  const handleBulkDelete = async () => {
    setBulkAction("delete");
    setBulkActionDialogOpen(true);
  };

  const handleBulkMove = () => {
    setBulkAction("move");
    setBulkActionDialogOpen(true);
  };

  const handleBulkDownload = async () => {
    const filesToDownload = sortedFiles.filter((f) => selectedFiles.has(f.id) && f.url);
    if (filesToDownload.length === 0) {
      toast.error("No files to download");
      return;
    }

    toast.info(`Starting download of ${filesToDownload.length} files...`);

    await downloadMultiple(
      filesToDownload.map((f) => ({ url: f.url!, fileName: `${f.name}.pdf` })),
      3
    );

    setSelectedFiles(new Set());
  };

  const handleFileDownload = (file: {url?: string | null;name: string;}) => {
    if (!file.url) {
      toast.error("File URL not available");
      return;
    }
    downloadFile(file.url, `${file.name}.pdf`);
    // Log activity
    logActivity("download_pdf", { fileName: file.name });
  };

  const confirmBulkAction = async () => {
    if (bulkAction === "delete") {
      const filesToDelete = sortedFiles.filter((f) => selectedFiles.has(f.id));
      for (const file of filesToDelete) {
        await deleteFile(file.id, file.storage_path);
      }
      toast.success(`Deleted ${filesToDelete.length} files`);
    } else if (bulkAction === "move" && bulkMoveCategory) {
      for (const fileId of selectedFiles) {
        await updateFileCategory(fileId, bulkMoveCategory === "uncategorized" ? null : bulkMoveCategory);
      }
      toast.success(`Moved ${selectedFiles.size} files`);
    }

    setSelectedFiles(new Set());
    setBulkActionDialogOpen(false);
    setBulkAction(null);
    setBulkMoveCategory("");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === "application/pdf"
    );

    if (droppedFiles.length === 0) {
      toast.error("Please drop PDF files only");
      return;
    }

    // Use upload manager for batch uploads
    uploadManager.addFiles(droppedFiles, selectedCategory === "all" ? null : selectedCategory);
  };

  const storageUsed = profileStorageUsed ?? 0;

  const filteredFiles = selectedCategory === "all" ?
  files :
  selectedCategory === "favorites" ?
  files.filter((f) => f.is_favorite) :
  files.filter((f) => f.category_id === selectedCategory || selectedCategory === "uncategorized" && !f.category_id);

  const searchFilteredFiles = searchQuery.trim() ?
  filteredFiles.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase())) :
  filteredFiles;

  const sortedFiles = [...searchFilteredFiles].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "date":
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "size":
        comparison = a.file_size - b.file_size;
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  const fileCount = sortedFiles.length;

  const handleAutoOrganize = async (organizeAll = false) => {
    const filesToOrganize = organizeAll ?
    files :
    files.filter((f) => f.category_id === null);
    if (filesToOrganize.length === 0) {
      toast.info(organizeAll ? "No files to organize!" : "All files are already categorized!");
      return;
    }
    const customCategories = categories.filter(
      (c) => c.id !== "favorites" && c.id !== "uncategorized"
    );
    if (customCategories.length === 0) {
      toast.error("Create some categories first so AI can organize your files.");
      return;
    }
    setIsOrganizing(true);
    toast.loading(`AI is organizing ${filesToOrganize.length} file${filesToOrganize.length !== 1 ? "s" : ""}...`, { id: "organize" });
    try {
      const { data, error } = await supabase.functions.invoke("organize-pdfs", {
        body: {
          files: filesToOrganize.map((f) => ({ id: f.id, name: f.name })),
          categories: customCategories.map((c) => ({ id: c.id, name: c.name }))
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const assignments: {fileId: string;categoryId: string;}[] = data.assignments || [];
      if (assignments.length === 0) {
        toast.info("AI couldn't find matching categories for your files.", { id: "organize" });
        return;
      }
      let successCount = 0;
      for (const { fileId, categoryId } of assignments) {
        try {
          await updateFileCategory(fileId, categoryId);
          successCount++;
        } catch {/* skip */}
      }
      toast.success(`Organized ${successCount} file${successCount !== 1 ? "s" : ""} into categories!`, { id: "organize" });
    } catch (err: any) {
      console.error("Auto-organize error:", err);
      toast.error(err.message || "Failed to organize files", { id: "organize" });
    } finally {
      setIsOrganizing(false);
    }
  };

  return (
    <SidebarProvider>
      <SparkleBackground />
      <div className="min-h-screen flex w-full relative z-10">
        <AppSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          files={files}
          newCategoryName={newCategoryName}
          onNewCategoryNameChange={setNewCategoryName}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          isAdmin={isAdmin}
          isRep={isRep}
          repUserId={user?.id}
          onSignOut={signOut}
          onOpenTutorial={() => setShowTutorial(true)}
          storageUsed={storageUsed}
          onOpenAIFeature={handleOpenAIFeature}
          recentFiles={recentFiles}
          onOpenRecentFile={handleOpenRecentFile} />
        
        
        <main className="flex-1 flex flex-col w-full min-w-0">
          <AdminBannerDisplay />
          {!isOnline &&
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">You're offline — only cached PDFs are available</p>
            </div>
          }
          <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2 p-4">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">PDFNest</h1>
              <DesktopHeaderNav />
              <div className="ml-auto flex items-center gap-2">
                <div id="view-toggle" className="relative flex items-center border rounded-md">
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => {setViewMode("list");localStorage.setItem("pdfnest-view-mode", "list");}}
                    className="rounded-r-none">
                    
                    <LayoutList className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => {setViewMode("grid");localStorage.setItem("pdfnest-view-mode", "grid");}}
                    className="rounded-l-none">
                    
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  {showViewHint &&
                  <div className="absolute top-full right-0 mt-2 w-56 p-3 rounded-lg bg-popover border shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
                      <p className="text-xs text-foreground font-medium mb-1">💡 View Mode</p>
                      <p className="text-xs text-muted-foreground mb-2">Switch between Grid and List view using this toggle.</p>
                      <Button size="sm" variant="secondary" className="w-full h-7 text-xs" onClick={() => setShowViewHint(false)}>Got it</Button>
                    </div>
                  }
                </div>
                <InstallPWA />
                <div id="theme-toggle">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </header>
          
          <div className="flex-1 p-4 md:p-6 pb-28 overflow-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-4">
                <svg className="w-10 h-10 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                Organize Your PDFs
              </h1>
              <p className="text-muted-foreground text-lg">
                Upload, categorize, and manage your documents effortlessly   
              </p>
            </div>

            {/* Getting Started Checklist for new users */}
            {showChecklist && user &&
            <GettingStartedChecklist
              completedItems={completedChecklistItems}
              onDismiss={() => {
                setShowChecklist(false);
                localStorage.setItem(`checklist-dismissed-${user.id}`, 'true');
              }}
              userId={user.id} />

            }

            {/* Hidden file input for FAB */}
            <Input
              id="file-input"
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileUpload}
              className="hidden" />
            

            {/* Upload progress */}
            {uploadProgress.size > 0 &&
            <div className="bg-card rounded-xl shadow-sm border border-border/50 p-4 mb-6 space-y-3">
                <h4 className="text-sm font-medium">Uploading files...</h4>
                {Array.from(uploadProgress.entries()).map(([id, progress]) =>
              <div key={id} className="bg-muted/30 rounded-lg p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <span className="text-sm truncate max-w-full overflow-hidden">{progress.fileName}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm text-muted-foreground">{progress.progress}%</span>
                        {progress.status === "uploading" &&
                    <button onClick={() => cancelUpload(id)} className="p-1 hover:bg-destructive/10 rounded text-destructive" title="Cancel upload">
                            <X className="w-4 h-4" />
                          </button>
                    }
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                    className={`h-full transition-all duration-300 ${
                    progress.status === "error" ? "bg-destructive" : progress.status === "complete" ? "bg-white" : "bg-primary"}`
                    }
                    style={{ width: `${progress.progress}%` }} />
                  
                    </div>
                    {progress.status === "error" &&
                <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-destructive">Upload failed</p>
                        <button onClick={() => retryUpload(id)} className="text-xs text-primary hover:underline">Retry</button>
                      </div>
                }
                    {progress.status === "complete" &&
                <p className="text-xs text-green-600 mt-1">Upload complete!</p>
                }
                  </div>
              )}
              </div>
            }

            <div className="bg-card rounded-xl shadow-sm border border-border/50 p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <h2 className="text-xl font-semibold">
                    {selectedCategory === "all" ? "All Files" : categories.find((c) => c.id === selectedCategory)?.name} ({fileCount})
                  </h2>
                  {selectedFiles.size > 0 &&
                  <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-muted-foreground">
                        {selectedFiles.size} selected
                      </span>
                      <Button size="sm" variant="secondary" onClick={handleBulkDownload}>
                        <Download className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">Download</span>
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleBulkMove}>
                        <span className="hidden sm:inline">Move to Category</span>
                        <span className="sm:hidden">Move</span>
                      </Button>
                      <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                        <span className="hidden sm:inline">Delete Selected</span>
                        <span className="sm:hidden">Delete</span>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedFiles(new Set())}>
                        Clear
                      </Button>
                    </div>
                  }
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <Input
                    id="search-bar"
                    type="text"
                    placeholder="Search PDFs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:max-w-xs" />
                  
                  <div className="flex gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-border bg-background text-sm">
                      
                      <option value="date">Date</option>
                      <option value="name">Name</option>
                      <option value="size">Size</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                      
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isOrganizing}
                          title="Auto-organize files with AI">
                          
                          <Sparkles className={`w-4 h-4 mr-1 ${isOrganizing ? "animate-spin" : ""}`} />
                          <span className="hidden sm:inline">{isOrganizing ? "Organizing..." : "Auto-Organize"}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAutoOrganize(false)}>
                          Organize uncategorized only
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAutoOrganize(true)}>
                          Re-organize all files
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {filesLoading && files.length === 0 ?
              <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) =>
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border animate-pulse">
                      <div className="w-10 h-12 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-2/3" />
                        <div className="h-3 bg-muted rounded w-1/4" />
                      </div>
                    </div>
                )}
                </div> :
              searchFilteredFiles.length === 0 ?
              <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                    <svg className="w-8 h-8 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M15,18V16H6V18H15M18,14V12H6V14H18Z" />
                    </svg>
                  </div>
                  <p className="text-muted-foreground">
                    {searchQuery ? "No files match your search" : "No files yet. Upload some PDFs to get started!"}
                  </p>
                </div> :

              <>
                  {viewMode === "list" ?
                <div className="space-y-2">
                      {sortedFiles.length > 0 &&
                  <div className="flex items-center gap-2 p-2 border-b border-border">
                          <input
                      type="checkbox"
                      checked={selectedFiles.size === sortedFiles.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 cursor-pointer" />
                    
                          <span className="text-sm text-muted-foreground">Select all</span>
                        </div>
                  }
                      {sortedFiles.map((file) =>
                  <div
                    key={file.id}
                    className="flex flex-col gap-2 p-3 md:p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        className="w-4 h-4 cursor-pointer flex-shrink-0" />
                      
                        <div className="flex-shrink-0">
                          <div className="w-10 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center border border-primary/20 shadow-sm">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                          {editingFileId === file.id ?
                        <div className="flex gap-2 items-center flex-wrap">
                              <Input
                            value={editingFileName}
                            onChange={(e) => setEditingFileName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit();
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                            className="h-8 flex-1 min-w-[120px]"
                            autoFocus />
                          
                              <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                            </div> :

                        <>
                              <h3 className="font-medium text-sm md:text-base truncate overflow-hidden text-ellipsis whitespace-nowrap">
                                {file.name}
                              </h3>
                              <p className="text-xs md:text-sm text-muted-foreground">
                                {(file.file_size / 1024).toFixed(2)} KB
                              </p>
                            </>
                        }
                        </div>
                      </div>
                      
                      {editingFileId !== file.id &&
                    <div className="flex items-center gap-2 flex-wrap ml-12 md:ml-0">
                          <button
                        onClick={() => toggleFavorite(file.id, file.is_favorite)}
                        className={`p-2 hover:bg-accent rounded-lg flex-shrink-0 ${file.is_favorite ? "text-yellow-500" : ""}`}
                        title={file.is_favorite ? "Remove from favorites" : "Add to favorites"}>
                        
                            <svg className="w-5 h-5" fill={file.is_favorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>

                          <div className="md:hidden">
                            <span className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground">
                              {file.category_id ?
                          categories.find((c) => c.id === file.category_id)?.name :
                          "Uncategorized"}
                            </span>
                          </div>
                          <select
                        value={file.category_id || "uncategorized"}
                        onChange={(e) => updateFileCategory(file.id, e.target.value === "uncategorized" ? null : e.target.value)}
                        className="hidden md:block p-2 rounded-lg border border-border bg-background text-sm flex-shrink-0">
                        
                            <option value="uncategorized">Uncategorized</option>
                            {categories.filter((c) => c.id !== "uncategorized" && c.id !== "favorites").map((cat) =>
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                        )}
                          </select>

                          <div className="hidden md:flex md:items-center md:gap-2">
                            <button
                          onClick={() => handleStartEdit(file.id, file.name)}
                          className="p-2 hover:bg-accent rounded-lg flex-shrink-0"
                          title="Rename file">
                          
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
                              </svg>
                            </button>
                            {(file.url || file.isOfflineAvailable) &&
                        <>
                                 <button
                            onClick={() => handleOpenPreview(file)}
                            className="p-2 hover:bg-accent rounded-lg flex-shrink-0"
                            title="Preview PDF">
                            
                                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                     <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
                                    </svg>
                                  </button>
                                  {file.url &&
                          <button
                            onClick={() => handleFileDownload(file)}
                            className="p-2 hover:bg-accent rounded-lg flex-shrink-0"
                            title="Download file">
                            
                                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                                      </svg>
                                    </button>
                          }
                                  <button
                            onClick={async () => {
                              if (!file.isOfflineAvailable && file.url) {
                                const saved = await cacheForOffline(file.id, file.url, file.name);
                                if (saved) {
                                  toast.success("Saved for offline access");
                                }
                              }
                            }}
                            className={`p-2 hover:bg-accent rounded-lg flex-shrink-0 ${file.isOfflineAvailable ? "text-green-500" : ""}`}
                            title={file.isOfflineAvailable ? "Available offline" : "Save offline"}>
                            
                                    {file.isOfflineAvailable ? <CheckCircle className="w-5 h-5" /> : <CloudDownload className="w-5 h-5" />}
                                  </button>
                               </>
                        }
                             <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                 <button
                              className="p-2 hover:bg-accent rounded-lg flex-shrink-0"
                              title="AI Features">
                              
                                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                     <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,17V16H9V14H13V13H10A1,1 0 0,1 9,12V9A1,1 0 0,1 10,8H14V9H12V11H15V14H11V17Z" />
                                   </svg>
                                 </button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end" className="z-50 bg-popover">
                                  <DropdownMenuItem onClick={() => {
                              setSelectedFileForAI({ id: file.id, name: file.name });
                              setActiveAIModal('summary');
                              trackRecentFile(file.id, file.name);
                            }}>
                                    📄 Summarize
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                              setSelectedFileForAI({ id: file.id, name: file.name });
                              setActiveAIModal('study-guide');
                              trackRecentFile(file.id, file.name);
                            }}>
                                    📚 Study Guide
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                              setSelectedFileForAI({ id: file.id, name: file.name });
                              setActiveAIModal('voice');
                              trackRecentFile(file.id, file.name);
                            }}>
                                    🔊 Voice Reader
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                              setSelectedFileForAI({ id: file.id, name: file.name });
                              setActiveAIModal('translate');
                              trackRecentFile(file.id, file.name);
                            }}>
                                    🌐 Translate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                              setSelectedFileForAI({ id: file.id, name: file.name });
                              setActiveAIModal('chat');
                              trackRecentFile(file.id, file.name);
                            }}>
                                    💬 Chat with PDF
                                  </DropdownMenuItem>
                               </DropdownMenuContent>
                             </DropdownMenu>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="md:hidden p-2 h-auto">
                                <MoreVertical className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="z-50 bg-popover">
                              <DropdownMenuItem onClick={() => {
                            const dropdown = document.activeElement as HTMLElement;
                            dropdown?.blur();
                            setTimeout(() => handleStartEdit(file.id, file.name), 100);
                          }}>
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
                                </svg>
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <Folder className="w-4 h-4 mr-2" />
                                  Change Category
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="z-50 bg-popover">
                                  <DropdownMenuItem onClick={() => updateFileCategory(file.id, null)}>
                                    Uncategorized
                                  </DropdownMenuItem>
                                  {categories.filter((c) => c.id !== "uncategorized" && c.id !== "favorites").map((cat) =>
                              <DropdownMenuItem
                                key={cat.id}
                                onClick={() => updateFileCategory(file.id, cat.id)}>
                                
                                      {cat.name}
                                    </DropdownMenuItem>
                              )}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                                {(file.url || file.isOfflineAvailable) &&
                          <>
                                  <DropdownMenuItem onClick={() => handleOpenPreview(file)}>
                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
                                    </svg>
                                    Preview
                                  </DropdownMenuItem>
                                  {file.url &&
                            <DropdownMenuItem onClick={() => handleFileDownload(file)}>
                                       <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                         <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                                       </svg>
                                        Download
                                     </DropdownMenuItem>
                            }
                                 </>
                          }
                               <DropdownMenuItem onClick={async () => {
                            if (!file.isOfflineAvailable && file.url) {
                              const saved = await cacheForOffline(file.id, file.url, file.name);
                              if (saved) {
                                toast.success("Saved for offline access");
                              }
                            }
                          }}>
                                 {file.isOfflineAvailable ? <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> : <CloudDownload className="w-4 h-4 mr-2" />}
                                 {file.isOfflineAvailable ? "Saved Offline" : "Save Offline"}
                               </DropdownMenuItem>
                               <DropdownMenuSeparator />
                               <DropdownMenuSub>
                                 <DropdownMenuSubTrigger>
                                   <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                     <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z" />
                                   </svg>
                                   AI Features
                                 </DropdownMenuSubTrigger>
                                 <DropdownMenuSubContent className="z-50 bg-popover">
                                    <DropdownMenuItem onClick={() => {
                                setSelectedFileForAI({ id: file.id, name: file.name });
                                setActiveAIModal('summary');
                                trackRecentFile(file.id, file.name);
                              }}>
                                      📄 Summarize
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                setSelectedFileForAI({ id: file.id, name: file.name });
                                setActiveAIModal('study-guide');
                                trackRecentFile(file.id, file.name);
                              }}>
                                      📚 Study Guide
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                setSelectedFileForAI({ id: file.id, name: file.name });
                                setActiveAIModal('voice');
                                trackRecentFile(file.id, file.name);
                              }}>
                                      🔊 Voice Reader
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                setSelectedFileForAI({ id: file.id, name: file.name });
                                setActiveAIModal('translate');
                                trackRecentFile(file.id, file.name);
                              }}>
                                      🌐 Translate
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                setSelectedFileForAI({ id: file.id, name: file.name });
                                setActiveAIModal('chat');
                                trackRecentFile(file.id, file.name);
                              }}>
                                      💬 Chat with PDF
                                    </DropdownMenuItem>
                                 </DropdownMenuSubContent>
                               </DropdownMenuSub>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <button
                        onClick={() => deleteFile(file.id, file.storage_path)}
                        className="p-2 hover:bg-destructive/10 rounded-lg text-destructive flex-shrink-0"
                        title="Delete file">
                        
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                            </svg>
                          </button>
                        </div>
                    }
                    </div>
                  )}
                </div> :

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {sortedFiles.map((file) =>
                  <div
                    key={file.id}
                    className="group relative flex flex-col gap-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    
                      <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => toggleFileSelection(file.id)}
                      className="absolute top-2 left-2 w-4 h-4 z-10" />
                    

                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                        <div className="w-full h-full flex flex-col items-center justify-center p-3">
                          <FileText className="w-12 h-12 text-primary mb-2" />
                          <div className="w-full space-y-1">
                            <div className="h-1.5 bg-primary/20 rounded-full w-full"></div>
                            <div className="h-1.5 bg-primary/15 rounded-full w-4/5"></div>
                            <div className="h-1.5 bg-primary/10 rounded-full w-3/5"></div>
                          </div>
                        </div>
                        
                        {file.is_favorite &&
                      <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          </div>
                      }

                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenPreview(file)}
                          className="h-8 w-8 p-0">
                          
                            <FileText className="w-4 h-4" />
                          </Button>
                          {file.url &&
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = file.url!;
                            link.download = file.name;
                            link.click();
                          }}
                          className="h-8 w-8 p-0">
                          
                              <Download className="w-4 h-4" />
                            </Button>
                        }
                        </div>
                      </div>

                      <div className="space-y-1 min-w-0">
                        {editingFileId === file.id ?
                      <div className="flex gap-1 items-center">
                            <Input
                          value={editingFileName}
                          onChange={(e) => setEditingFileName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit();
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                          className="h-7 text-xs"
                          autoFocus />
                        
                            <Button size="sm" onClick={handleSaveEdit} className="h-7 w-7 p-0">
                              <Check className="w-3 h-3" />
                            </Button>
                          </div> :

                      <h3 className="font-medium text-xs truncate overflow-hidden text-ellipsis whitespace-nowrap" title={file.name}>
                            {file.name}
                          </h3>
                      }
                        <p className="text-[10px] text-muted-foreground">
                          {(file.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap">
                        <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleFavorite(file.id, file.is_favorite)}
                        className="h-7 w-7 p-0">
                        
                          <Star className={`w-3 h-3 ${file.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                        </Button>
                        <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!file.isOfflineAvailable && file.url) {
                            const saved = await cacheForOffline(file.id, file.url, file.name);
                            if (saved) {
                              toast.success("Saved for offline access");
                            }
                          }
                        }}
                        className={`h-7 w-7 p-0 ${file.isOfflineAvailable ? "text-green-500" : ""}`}
                        title={file.isOfflineAvailable ? "Available offline" : "Save offline"}>
                        
                          {file.isOfflineAvailable ? <CheckCircle className="w-3 h-3" /> : <CloudDownload className="w-3 h-3" />}
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStartEdit(file.id, file.name)}>
                              <Edit2 className="w-3 h-3 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <Folder className="w-3 h-3 mr-2" />
                                Category
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => updateFileCategory(file.id, null)}>
                                  Uncategorized
                                </DropdownMenuItem>
                                {categories.filter((c) => c.id !== "uncategorized" && c.id !== "favorites").map((cat) =>
                              <DropdownMenuItem
                                key={cat.id}
                                onClick={() => updateFileCategory(file.id, cat.id)}>
                                
                                    {cat.name}
                                  </DropdownMenuItem>
                              )}
                              </DropdownMenuSubContent>
                             </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z" />
                                </svg>
                                AI Features
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="z-50 bg-popover">
                                <DropdownMenuItem onClick={() => {
                                setSelectedFileForAI({ id: file.id, name: file.name });
                                setActiveAIModal('summary');
                                trackRecentFile(file.id, file.name);
                              }}>
                                  📄 Summarize
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                setSelectedFileForAI({ id: file.id, name: file.name });
                                setActiveAIModal('study-guide');
                                trackRecentFile(file.id, file.name);
                              }}>
                                  📚 Study Guide
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                setSelectedFileForAI({ id: file.id, name: file.name });
                                setActiveAIModal('voice');
                                trackRecentFile(file.id, file.name);
                              }}>
                                  🔊 Voice Reader
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                setSelectedFileForAI({ id: file.id, name: file.name });
                                setActiveAIModal('translate');
                                trackRecentFile(file.id, file.name);
                              }}>
                                  🌐 Translate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                setSelectedFileForAI({ id: file.id, name: file.name });
                                setActiveAIModal('chat');
                                trackRecentFile(file.id, file.name);
                              }}>
                                  💬 Chat with PDF
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => deleteFile(file.id, file.storage_path)} className="text-destructive">
                              <Trash2 className="w-3 h-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}
                </div>
                }
                </>
              }

              {/* Load More */}
              {hasMore && !filesLoading && files.length > 0 &&
              <div className="text-center pt-6">
                  <Button variant="outline" onClick={loadMore} disabled={filesLoading}>
                    {filesLoading ? "Loading..." : "Load More"}
                  </Button>
                </div>
              }
            </div>
          </div>
        </main>
      </div>

      <PDFViewer
        isOpen={!!previewPdf}
        onClose={() => setPreviewPdf(null)}
        pdfUrl={previewPdf?.url || ""}
        fileName={previewPdf?.name || ""}
        fileSize={previewPdf?.fileSize}
        fileId={previewPdf?.fileId} />
      

      <NavigationTutorial
        open={showTutorial}
        onOpenChange={setShowTutorial} />
      

      <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === "delete" ? "Delete Files" : "Move Files"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "delete" ?
              `Are you sure you want to delete ${selectedFiles.size} files? This action cannot be undone.` :
              "Select a category to move the selected files to:"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {bulkAction === "move" &&
          <select
            value={bulkMoveCategory}
            onChange={(e) => setBulkMoveCategory(e.target.value)}
            className="w-full p-2 rounded-lg border border-border bg-background">
            
              <option value="">Select category...</option>
              <option value="uncategorized">Uncategorized</option>
              {categories.filter((c) => c.id !== "uncategorized" && c.id !== "favorites").map((cat) =>
            <option key={cat.id} value={cat.id}>{cat.name}</option>
            )}
            </select>
          }
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkAction}>
              {bulkAction === "delete" ? "Delete" : "Move"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? Files in this category will not be deleted, but will become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        {/* File Picker Modal */}
        <FilePicker
        open={showFilePicker}
        onOpenChange={setShowFilePicker}
        files={filteredFiles}
        onSelectFile={handleFileSelected}
        featureType={pendingAIFeature} />
      

        {/* AI Feature Modals */}
        <PDFSummaryModal
        open={activeAIModal === 'summary'}
        onOpenChange={(open) => !open && setActiveAIModal(null)}
        fileId={selectedFileForAI?.id || ''}
        fileName={selectedFileForAI?.name || ''} />
      

      <StudyGuideModal
        open={activeAIModal === 'study-guide'}
        onOpenChange={(open) => !open && setActiveAIModal(null)}
        fileId={selectedFileForAI?.id || ''}
        fileName={selectedFileForAI?.name || ''} />
      

      <PDFAudioPlayer
        open={activeAIModal === 'voice'}
        onOpenChange={(open) => !open && setActiveAIModal(null)}
        fileId={selectedFileForAI?.id || ''}
        fileName={selectedFileForAI?.name || ''} />
      

      <TranslatorModal
        open={activeAIModal === 'translate'}
        onOpenChange={(open) => !open && setActiveAIModal(null)}
        fileId={selectedFileForAI?.id || ''}
        fileName={selectedFileForAI?.name || ''} />
      

      <PDFChatInterface
        open={activeAIModal === 'chat'}
        onOpenChange={(open) => !open && setActiveAIModal(null)}
        fileId={selectedFileForAI?.id || ''}
        fileName={selectedFileForAI?.name || ''} />
      

      {/* Floating Action Button for quick upload */}
      <FloatingActionButton
        onUpload={() => document.getElementById("file-input")?.click()}
        onContribute={() => navigate("/contribute")} />
      

      {/* Download Progress */}
      <DownloadProgress
        downloads={downloads}
        onCancel={cancelDownload}
        onClearCompleted={clearCompleted} />
      


      {/* Bottom Navigation */}
      <SmartBottomNav />
      
      <footer className="fixed bottom-0 left-0 right-0 py-2 text-center md:block hidden">
        <p className="text-xs text-muted-foreground/60">
          Made with love ❤️ by Nexel
        </p>
      </footer>
    </SidebarProvider>);

}
