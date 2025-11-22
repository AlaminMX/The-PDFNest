import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { usePDFFiles } from "@/hooks/usePDFFiles";
import { useCategories } from "@/hooks/useCategories";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { InstallPWA } from "@/components/InstallPWA";
import { Link } from "react-router-dom";
import { Shield, MoreVertical, Plus, Trash2, LogOut, HelpCircle, Folder, LayoutGrid, LayoutList, FileText, Download, Edit2, Check, Star, X, Sparkles, BookOpen, Volume2, Languages, MessageSquare } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { PDFPreviewModal } from "@/components/PDFPreviewModal";
import { NavigationTutorial } from "@/components/NavigationTutorial";
import { ThumbnailGenerator } from "@/components/ThumbnailGenerator";
import { LazyImage } from "@/components/LazyImage";
import { StorageIndicator } from "@/components/StorageIndicator";
import { PDFSummaryModal } from "@/components/PDFSummaryModal";
import { StudyGuideModal } from "@/components/StudyGuideModal";
import { PDFAudioPlayer } from "@/components/PDFAudioPlayer";
import { TranslatorModal } from "@/components/TranslatorModal";
import { PDFChatInterface } from "@/components/PDFChatInterface";
import { FilePicker } from "@/components/FilePicker";

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
  onSignOut,
  onOpenTutorial,
  storageUsed,
  onOpenAIFeature,
  recentFiles,
  onOpenRecentFile
}: {
  categories: any[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  files: any[];
  newCategoryName: string;
  onNewCategoryNameChange: (name: string) => void;
  onAddCategory: () => void;
  onDeleteCategory: (id: string) => void;
  isAdmin: boolean;
  onSignOut: () => void;
  onOpenTutorial: () => void;
  storageUsed: number;
  onOpenAIFeature: (featureType: AIModalType) => void;
  recentFiles: RecentFile[];
  onOpenRecentFile: (fileId: string) => void;
}) {
  const { open } = useSidebar();
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  
  const handleAddCategoryLocal = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    onAddCategory();
    setShowNewCategoryForm(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
          </div>
          {open && (
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-semibold">PDFNest</span>
              <span className="text-xs text-muted-foreground">Organize PDFs</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup id="ai-features-section">
          <SidebarGroupLabel>
            <Sparkles className="w-4 h-4 mr-2" />
            AI Features
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onOpenAIFeature('summary')}>
                  <FileText className="w-4 h-4" />
                  {open && <span>📄 Summarize PDF</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onOpenAIFeature('study-guide')}>
                  <BookOpen className="w-4 h-4" />
                  {open && <span>📚 Study Guide</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onOpenAIFeature('voice')}>
                  <Volume2 className="w-4 h-4" />
                  {open && <span>🔊 Voice Reader</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onOpenAIFeature('translate')}>
                  <Languages className="w-4 h-4" />
                  {open && <span>🌐 Translate</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onOpenAIFeature('chat')}>
                  <MessageSquare className="w-4 h-4" />
                  {open && <span>💬 Chat with PDF</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recent Files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {recentFiles.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <span className="text-xs text-muted-foreground">No recent files</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                recentFiles.map((file) => (
                  <SidebarMenuItem key={file.id}>
                    <SidebarMenuButton onClick={() => onOpenRecentFile(file.id)}>
                      <FileText className="w-4 h-4 mr-2" />
                      <span className="truncate">{file.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={selectedCategory === "all"}
                  onClick={() => onSelectCategory("all")}
                >
                  <span>All Files</span>
                  {open && <span className="ml-auto text-xs">{files.length}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {categories.map((category) => {
                const count = files.filter((f) => 
                  category.id === "favorites" ? f.is_favorite :
                  category.id === "uncategorized" ? !f.category_id :
                  f.category_id === category.id
                ).length;
                
                return (
                  <SidebarMenuItem key={category.id}>
                    <SidebarMenuButton 
                      isActive={selectedCategory === category.id}
                      onClick={() => onSelectCategory(category.id)}
                    >
                      <span className="truncate">{category.name}</span>
                      {open && <span className="ml-auto text-xs">{count}</span>}
                    </SidebarMenuButton>
                    {category.id !== "uncategorized" && category.id !== "favorites" && (
                      <SidebarMenuAction onClick={() => onDeleteCategory(category.id)}>
                        <Trash2 className="w-4 h-4" />
                      </SidebarMenuAction>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
          
          <SidebarGroupContent className="mt-2">
            {!showNewCategoryForm ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowNewCategoryForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {open && "Add Category"}
              </Button>
            ) : (
              <div className="space-y-2 p-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => onNewCategoryNameChange(e.target.value)}
                  placeholder="Category name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCategoryLocal();
                    if (e.key === "Escape") {
                      onNewCategoryNameChange("");
                      setShowNewCategoryForm(false);
                    }
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={handleAddCategoryLocal}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onNewCategoryNameChange("");
                      setShowNewCategoryForm(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <div id="storage-indicator">
          <StorageIndicator storageUsed={storageUsed} />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onOpenTutorial}>
              <HelpCircle className="w-4 h-4" />
              {open && <span>Help & Tutorial</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/admin">
                  <Shield className="w-4 h-4" />
                  {open && <span>Admin Dashboard</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onSignOut}>
              <LogOut className="w-4 h-4" />
              {open && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function Index() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const { files, loading: filesLoading, uploadFile, deleteFile, updateFileCategory, renameFile, toggleFavorite, uploadProgress, cancelUpload, refreshFiles } = usePDFFiles(user?.id);
  const { categories, addCategory, deleteCategory } = useCategories(user?.id);
  
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
  const [previewPdf, setPreviewPdf] = useState<{ url: string; name: string } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"delete" | "move" | null>(null);
  const [bulkMoveCategory, setBulkMoveCategory] = useState<string>("");
  const [showTutorial, setShowTutorial] = useState(!localStorage.getItem("tutorial-completed"));
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [activeAIModal, setActiveAIModal] = useState<AIModalType>(null);
  const [selectedFileForAI, setSelectedFileForAI] = useState<{ id: string; name: string } | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [pendingAIFeature, setPendingAIFeature] = useState<AIModalType>(null);

  const categoryColors = [
    'bg-red-100 text-red-700',
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-yellow-100 text-yellow-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
    'bg-orange-100 text-orange-700'
  ];

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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your files...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
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

    for (const file of pdfFiles) {
      await uploadFile(file, selectedCategory === "all" ? null : selectedCategory);
    }

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

  const handleFileSelected = (fileId: string, fileName: string) => {
    setSelectedFileForAI({ id: fileId, name: fileName });
    setActiveAIModal(pendingAIFeature);
    setShowFilePicker(false);
    setPendingAIFeature(null);
    trackRecentFile(fileId, fileName);
  };

  const handleOpenPreview = (file: any) => {
    if (!file.url) return;
    setPreviewPdf({ url: file.url!, name: file.name });
    trackRecentFile(file.id, file.name);
  };

  const handleOpenRecentFile = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file) {
      handleOpenPreview(file);
    }
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
      setSelectedFiles(new Set(sortedFiles.map(f => f.id)));
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

  const confirmBulkAction = async () => {
    if (bulkAction === "delete") {
      const filesToDelete = sortedFiles.filter(f => selectedFiles.has(f.id));
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

    for (const file of droppedFiles) {
      await uploadFile(file, selectedCategory === "all" ? null : selectedCategory);
    }
  };

  const storageUsed = files.reduce((total, file) => total + (file.file_size || 0), 0);

  const filteredFiles = selectedCategory === "all" 
    ? files 
    : selectedCategory === "favorites"
    ? files.filter((f) => f.is_favorite)
    : files.filter((f) => f.category_id === selectedCategory || (selectedCategory === "uncategorized" && !f.category_id));

  const searchFilteredFiles = searchQuery.trim()
    ? filteredFiles.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredFiles;

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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
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
          onSignOut={signOut}
          onOpenTutorial={() => setShowTutorial(true)}
          storageUsed={storageUsed}
          onOpenAIFeature={handleOpenAIFeature}
          recentFiles={recentFiles}
          onOpenRecentFile={handleOpenRecentFile}
        />
        
        <main className="flex-1 flex flex-col w-full min-w-0">
          <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2 p-4">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">PDFNest</h1>
              <div className="ml-auto flex items-center gap-2">
                {isAdmin && <ThumbnailGenerator onComplete={refreshFiles} />}
                <div id="view-toggle" className="flex items-center border rounded-md">
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-r-none"
                  >
                    <LayoutList className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="rounded-l-none"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
                <InstallPWA />
                <div id="theme-toggle">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </header>
          
          <div className="flex-1 p-4 md:p-6 overflow-auto">
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

            <div 
              id="upload-area"
              className={`bg-card rounded-xl shadow-sm border-2 border-dashed transition-colors p-8 mb-6 ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Upload PDF Files</h3>
                <p className="text-muted-foreground mb-4">
                  Drag and drop your files here, or click to browse
                </p>
                <Input
                  id="file-input"
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button onClick={() => document.getElementById("file-input")?.click()}>
                  Choose Files
                </Button>
              </div>

              {uploadProgress.size > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="text-sm font-medium">Uploading files...</h4>
                  {Array.from(uploadProgress.entries()).map(([id, progress]) => (
                    <div key={id} className="bg-muted/30 rounded-lg p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <span className="text-sm truncate max-w-full overflow-hidden">{progress.fileName}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm text-muted-foreground">
                            {progress.progress}%
                          </span>
                          {progress.status === "uploading" && (
                            <button
                              onClick={() => cancelUpload(id)}
                              className="p-1 hover:bg-destructive/10 rounded text-destructive"
                              title="Cancel upload"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            progress.status === "error" 
                              ? "bg-destructive" 
                              : progress.status === "complete"
                              ? "bg-green-500"
                              : "bg-primary"
                          }`}
                          style={{ width: `${progress.progress}%` }}
                        />
                      </div>
                      {progress.status === "error" && (
                        <p className="text-xs text-destructive mt-1">Upload failed</p>
                      )}
                      {progress.status === "complete" && (
                        <p className="text-xs text-green-600 mt-1">Upload complete!</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border/50 p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <h2 className="text-xl font-semibold">
                    {selectedCategory === "all" ? "All Files" : categories.find(c => c.id === selectedCategory)?.name} ({fileCount})
                  </h2>
                  {selectedFiles.size > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-muted-foreground">
                        {selectedFiles.size} selected
                      </span>
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
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <Input
                    id="search-bar"
                    type="text"
                    placeholder="Search PDFs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:max-w-xs"
                  />
                  <div className="flex gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    >
                      <option value="date">Date</option>
                      <option value="name">Name</option>
                      <option value="size">Size</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    >
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </Button>
                  </div>
                </div>
              </div>

              {filesLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading files...</p>
                </div>
              ) : searchFilteredFiles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                    <svg className="w-8 h-8 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M15,18V16H6V18H15M18,14V12H6V14H18Z" />
                    </svg>
                  </div>
                  <p className="text-muted-foreground">
                    {searchQuery ? "No files match your search" : "No files yet. Upload some PDFs to get started!"}
                  </p>
                </div>
              ) : (
                <>
                  {viewMode === "list" ? (
                    <div className="space-y-2">
                      {sortedFiles.length > 0 && (
                        <div className="flex items-center gap-2 p-2 border-b border-border">
                          <input
                            type="checkbox"
                            checked={selectedFiles.size === sortedFiles.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className="text-sm text-muted-foreground">Select all</span>
                        </div>
                      )}
                      {sortedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex flex-col gap-2 p-3 md:p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.id)}
                          onChange={() => toggleFileSelection(file.id)}
                          className="w-4 h-4 cursor-pointer flex-shrink-0"
                        />
                        <div className="flex-shrink-0">
                          {file.thumbnail_url ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-border">
                              <LazyImage
                                src={file.thumbnail_url}
                                alt={`${file.name} thumbnail`}
                                className="w-full h-full object-cover"
                                skeletonClassName="w-10 h-10"
                                fallback={
                                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-primary" />
                                  </div>
                                }
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <FileText className="w-6 h-6 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                          {editingFileId === file.id ? (
                            <div className="flex gap-2 items-center flex-wrap">
                              <Input
                                value={editingFileName}
                                onChange={(e) => setEditingFileName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEdit();
                                  if (e.key === "Escape") handleCancelEdit();
                                }}
                                className="h-8 flex-1 min-w-[120px]"
                                autoFocus
                              />
                              <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                            </div>
                          ) : (
                            <>
                              <h3 className="font-medium text-sm md:text-base truncate overflow-hidden text-ellipsis whitespace-nowrap">
                                {file.name}
                              </h3>
                              <p className="text-xs md:text-sm text-muted-foreground">
                                {(file.file_size / 1024).toFixed(2)} KB
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {editingFileId !== file.id && (
                        <div className="flex items-center gap-2 flex-wrap ml-12 md:ml-0">
                          <button
                            onClick={() => toggleFavorite(file.id, file.is_favorite)}
                            className={`p-2 hover:bg-accent rounded-lg flex-shrink-0 ${file.is_favorite ? "text-yellow-500" : ""}`}
                            title={file.is_favorite ? "Remove from favorites" : "Add to favorites"}
                          >
                            <svg className="w-5 h-5" fill={file.is_favorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>

                          <div className="md:hidden">
                            <span className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground">
                              {file.category_id 
                                ? categories.find(c => c.id === file.category_id)?.name 
                                : "Uncategorized"}
                            </span>
                          </div>
                          <select
                            value={file.category_id || "uncategorized"}
                            onChange={(e) => updateFileCategory(file.id, e.target.value === "uncategorized" ? null : e.target.value)}
                            className="hidden md:block p-2 rounded-lg border border-border bg-background text-sm flex-shrink-0"
                          >
                            <option value="uncategorized">Uncategorized</option>
                            {categories.filter(c => c.id !== "uncategorized" && c.id !== "favorites").map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>

                          <div className="hidden md:flex md:items-center md:gap-2">
                            <button
                              onClick={() => handleStartEdit(file.id, file.name)}
                              className="p-2 hover:bg-accent rounded-lg flex-shrink-0"
                              title="Rename file"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
                              </svg>
                            </button>
                            {file.url && (
                              <>
                                <button
                                  onClick={() => handleOpenPreview(file)}
                                  className="p-2 hover:bg-accent rounded-lg flex-shrink-0"
                                  title="Preview PDF"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
                                   </svg>
                                 </button>
                                 <a
                                   href={file.url}
                                   download={file.name}
                                   className="p-2 hover:bg-accent rounded-lg flex-shrink-0"
                                   title="Download file"
                                 >
                                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                     <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                                   </svg>
                                 </a>
                               </>
                             )}
                             <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                 <button
                                   className="p-2 hover:bg-accent rounded-lg flex-shrink-0"
                                   title="AI Features"
                                 >
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
                                  {categories.filter(c => c.id !== "uncategorized" && c.id !== "favorites").map((cat) => (
                                    <DropdownMenuItem 
                                      key={cat.id} 
                                      onClick={() => updateFileCategory(file.id, cat.id)}
                                    >
                                      {cat.name}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                                {file.url && (
                                  <>
                                  <DropdownMenuItem onClick={() => handleOpenPreview(file)}>
                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
                                    </svg>
                                    Preview
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = file.url!;
                                    link.download = file.name;
                                    link.click();
                                  }}>
                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                                    </svg>
                                     Download
                                   </DropdownMenuItem>
                                 </>
                               )}
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
                            title="Delete file"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {sortedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="group relative flex flex-col gap-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        className="absolute top-2 left-2 w-4 h-4 z-10"
                      />

                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded bg-muted">
                        {file.thumbnail_url ? (
                          <LazyImage
                            src={file.thumbnail_url}
                            alt={file.name}
                            className="w-full h-full object-cover cursor-pointer"
                            skeletonClassName="w-full h-full"
                            fallback={
                              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                <FileText className="w-16 h-16 text-primary" />
                              </div>
                            }
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/10">
                            <FileText className="w-16 h-16 text-primary" />
                          </div>
                        )}
                        
                        {file.is_favorite && (
                          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenPreview(file)}
                            className="h-8 w-8 p-0"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          {file.url && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = file.url!;
                                link.download = file.name;
                                link.click();
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 min-w-0">
                        {editingFileId === file.id ? (
                          <div className="flex gap-1 items-center">
                            <Input
                              value={editingFileName}
                              onChange={(e) => setEditingFileName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit();
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              className="h-7 text-xs"
                              autoFocus
                            />
                            <Button size="sm" onClick={handleSaveEdit} className="h-7 w-7 p-0">
                              <Check className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <h3 className="font-medium text-xs truncate overflow-hidden text-ellipsis whitespace-nowrap" title={file.name}>
                            {file.name}
                          </h3>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {(file.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleFavorite(file.id, file.is_favorite)}
                          className="h-7 w-7 p-0"
                        >
                          <Star className={`w-3 h-3 ${file.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
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
                                {categories.filter(c => c.id !== "uncategorized" && c.id !== "favorites").map((cat) => (
                                  <DropdownMenuItem 
                                    key={cat.id} 
                                    onClick={() => updateFileCategory(file.id, cat.id)}
                                  >
                                    {cat.name}
                                  </DropdownMenuItem>
                                ))}
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
                  ))}
                </div>
              )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      <PDFPreviewModal
        isOpen={!!previewPdf}
        onClose={() => setPreviewPdf(null)}
        pdfUrl={previewPdf?.url || ""}
        fileName={previewPdf?.name || ""}
      />

      <NavigationTutorial 
        open={showTutorial} 
        onOpenChange={setShowTutorial} 
      />

      <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === "delete" ? "Delete Files" : "Move Files"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "delete" 
                ? `Are you sure you want to delete ${selectedFiles.size} files? This action cannot be undone.`
                : "Select a category to move the selected files to:"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {bulkAction === "move" && (
            <select
              value={bulkMoveCategory}
              onChange={(e) => setBulkMoveCategory(e.target.value)}
              className="w-full p-2 rounded-lg border border-border bg-background"
            >
              <option value="">Select category...</option>
              <option value="uncategorized">Uncategorized</option>
              {categories.filter(c => c.id !== "uncategorized" && c.id !== "favorites").map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}
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
          featureType={pendingAIFeature}
        />

        {/* AI Feature Modals */}
        <PDFSummaryModal
          open={activeAIModal === 'summary'}
          onOpenChange={(open) => !open && setActiveAIModal(null)}
          fileId={selectedFileForAI?.id || ''}
          fileName={selectedFileForAI?.name || ''}
        />

      <StudyGuideModal
        open={activeAIModal === 'study-guide'}
        onOpenChange={(open) => !open && setActiveAIModal(null)}
        fileId={selectedFileForAI?.id || ''}
        fileName={selectedFileForAI?.name || ''}
      />

      <PDFAudioPlayer
        open={activeAIModal === 'voice'}
        onOpenChange={(open) => !open && setActiveAIModal(null)}
        fileId={selectedFileForAI?.id || ''}
        fileName={selectedFileForAI?.name || ''}
      />

      <TranslatorModal
        open={activeAIModal === 'translate'}
        onOpenChange={(open) => !open && setActiveAIModal(null)}
        fileId={selectedFileForAI?.id || ''}
        fileName={selectedFileForAI?.name || ''}
      />

      <PDFChatInterface
        open={activeAIModal === 'chat'}
        onOpenChange={(open) => !open && setActiveAIModal(null)}
        fileId={selectedFileForAI?.id || ''}
        fileName={selectedFileForAI?.name || ''}
      />

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-2 text-center">
        <p className="text-xs text-muted-foreground/60">
          Made with love ❤️ by Nexel
        </p>
      </footer>
    </SidebarProvider>
  );
}
