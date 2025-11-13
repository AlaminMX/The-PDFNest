import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePDFFiles } from "@/hooks/usePDFFiles";
import { useCategories } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
import { PDFPreviewModal } from "@/components/PDFPreviewModal";

type SortOption = "name" | "date" | "size";
type SortOrder = "asc" | "desc";

export default function Index() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { files, loading: filesLoading, uploadFile, deleteFile, updateFileCategory, renameFile, toggleFavorite, uploadProgress, cancelUpload } = usePDFFiles(user?.id);
  const { categories, addCategory, deleteCategory } = useCategories(user?.id);
  
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [showMobileCategories, setShowMobileCategories] = useState(false);
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

    // Reset input
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
    setShowNewCategoryForm(false);
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

  const filteredFiles = selectedCategory === "all" 
    ? files 
    : selectedCategory === "favorites"
    ? files.filter((f) => f.is_favorite)
    : files.filter((f) => f.category_id === selectedCategory || (selectedCategory === "uncategorized" && !f.category_id));

  const searchFilteredFiles = searchQuery.trim()
    ? filteredFiles.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredFiles;

  // Sort files
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
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
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
          <Button onClick={signOut} variant="outline" className="mt-4">
            Sign Out
          </Button>
        </div>

        <div className="flex gap-6">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-card rounded-xl shadow-sm border border-border/50 p-4 sticky top-4">
              <h2 className="text-lg font-semibold mb-4">Categories</h2>
              
              <button
                onClick={() => setSelectedCategory("all")}
                className={`w-full text-left px-3 py-2 rounded-lg mb-2 transition-colors ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>All Files</span>
                  <span className="text-sm">{files.length}</span>
                </div>
              </button>

              <div className="space-y-1 mb-4">
                {categories.map((category) => {
                  const count = files.filter((f) => 
                    category.id === "favorites"
                      ? f.is_favorite
                      : category.id === "uncategorized" 
                      ? !f.category_id 
                      : f.category_id === category.id
                  ).length;
                  
                  return (
                    <div key={category.id} className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedCategory(category.id)}
                        className={`flex-1 text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedCategory === category.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{category.name}</span>
                          <span className="text-sm">{count}</span>
                        </div>
                      </button>
                      {category.id !== "uncategorized" && category.id !== "favorites" && (
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-2 hover:bg-destructive/10 rounded-lg text-destructive"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {!showNewCategoryForm ? (
                <Button
                  onClick={() => setShowNewCategoryForm(true)}
                  variant="outline"
                  className="w-full"
                >
                  + Add Category
                </Button>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCategory();
                      if (e.key === "Escape") {
                        setShowNewCategoryForm(false);
                        setNewCategoryName("");
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddCategory} size="sm" className="flex-1">
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setShowNewCategoryForm(false);
                        setNewCategoryName("");
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Categories Toggle */}
          <div className="lg:hidden fixed bottom-4 left-4 right-4 z-10">
            <Button
              onClick={() => setShowMobileCategories(!showMobileCategories)}
              className="w-full shadow-lg"
            >
              Categories ({selectedCategory === "all" ? "All Files" : categories.find(c => c.id === selectedCategory)?.name})
            </Button>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Upload Area */}
            <div 
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
                  Drag and drop your files here or click to browse
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

              {/* Upload Progress */}
              {uploadProgress.size > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="text-sm font-medium">Uploading files...</h4>
                  {Array.from(uploadProgress.entries()).map(([id, progress]) => (
                    <div key={id} className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm truncate flex-1">{progress.fileName}</span>
                        <div className="flex items-center gap-2">
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

            {/* File List */}
            <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
              <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold">
                    {selectedCategory === "all" ? "All Files" : categories.find(c => c.id === selectedCategory)?.name} ({fileCount})
                  </h2>
                  {selectedFiles.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedFiles.size} selected
                      </span>
                      <Button size="sm" variant="outline" onClick={handleBulkMove}>
                        Move to Category
                      </Button>
                      <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                        Delete Selected
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedFiles(new Set())}>
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Input
                    type="text"
                    placeholder="Search PDFs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-xs"
                  />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
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
                      className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        className="w-4 h-4 cursor-pointer flex-shrink-0"
                      />
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingFileId === file.id ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              value={editingFileName}
                              onChange={(e) => setEditingFileName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit();
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              className="h-8"
                              autoFocus
                            />
                            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                          </div>
                        ) : (
                          <>
                            <h3 className="font-medium truncate">{file.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {(file.file_size / 1024).toFixed(2)} KB
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {editingFileId !== file.id && (
                          <>
                            <button
                              onClick={() => toggleFavorite(file.id, file.is_favorite)}
                              className={`p-2 hover:bg-accent rounded-lg ${file.is_favorite ? "text-yellow-500" : ""}`}
                              title={file.is_favorite ? "Remove from favorites" : "Add to favorites"}
                            >
                              <svg className="w-5 h-5" fill={file.is_favorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                            <select
                              value={file.category_id || "uncategorized"}
                              onChange={(e) => updateFileCategory(file.id, e.target.value === "uncategorized" ? null : e.target.value)}
                              className="p-2 rounded-lg border border-border bg-background text-sm"
                            >
                              <option value="uncategorized">Uncategorized</option>
                              {categories.filter(c => c.id !== "uncategorized" && c.id !== "favorites").map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleStartEdit(file.id, file.name)}
                              className="p-2 hover:bg-accent rounded-lg"
                              title="Rename file"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
                              </svg>
                            </button>
                            {file.url && (
                              <>
                                <button
                                  onClick={() => setPreviewPdf({ url: file.url!, name: file.name })}
                                  className="p-2 hover:bg-accent rounded-lg"
                                  title="Preview PDF"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
                                  </svg>
                                </button>
                                <a
                                  href={file.url}
                                  download={file.name}
                                  className="p-2 hover:bg-accent rounded-lg"
                                  title="Download file"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                                  </svg>
                                </a>
                              </>
                            )}
                            <button
                              onClick={() => deleteFile(file.id, file.storage_path)}
                              className="p-2 hover:bg-destructive/10 rounded-lg text-destructive"
                              title="Delete file"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PDFPreviewModal
        isOpen={!!previewPdf}
        onClose={() => setPreviewPdf(null)}
        pdfUrl={previewPdf?.url || ""}
        fileName={previewPdf?.name || ""}
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
            <AlertDialogAction 
              onClick={confirmBulkAction}
              className={bulkAction === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              disabled={bulkAction === "move" && !bulkMoveCategory}
            >
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
              Are you sure you want to delete this category? Files in this category will be moved to "Uncategorized".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
