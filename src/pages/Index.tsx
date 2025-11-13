import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePDFFiles } from "@/hooks/usePDFFiles";
import { useCategories } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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

export default function Index() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { files, loading: filesLoading, uploadFile, deleteFile, updateFileCategory } = usePDFFiles(user?.id);
  const { categories, addCategory, deleteCategory } = useCategories(user?.id);
  
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [showMobileCategories, setShowMobileCategories] = useState(false);

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

  const filteredFiles = selectedCategory === "all" 
    ? files 
    : files.filter((f) => f.category_id === selectedCategory || (selectedCategory === "uncategorized" && !f.category_id));

  const fileCount = selectedCategory === "all" ? files.length : filteredFiles.length;

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
                    category.id === "uncategorized" 
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
                      {category.id !== "uncategorized" && (
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
            <div className="bg-card rounded-xl shadow-sm border-2 border-dashed border-border hover:border-primary/50 transition-colors p-8 mb-6">
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
            </div>

            {/* File List */}
            <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  {selectedCategory === "all" ? "All Files" : categories.find(c => c.id === selectedCategory)?.name} ({fileCount})
                </h2>
              </div>

              {filesLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading files...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                    <svg className="w-8 h-8 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M15,18V16H6V18H15M18,14V12H6V14H18Z" />
                    </svg>
                  </div>
                  <p className="text-muted-foreground">No files yet. Upload some PDFs to get started!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{file.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {(file.file_size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {file.url && (
                          <a
                            href={file.url}
                            download={file.name}
                            className="p-2 hover:bg-accent rounded-lg"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                            </svg>
                          </a>
                        )}
                        <button
                          onClick={() => deleteFile(file.id, file.storage_path)}
                          className="p-2 hover:bg-destructive/10 rounded-lg text-destructive"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
