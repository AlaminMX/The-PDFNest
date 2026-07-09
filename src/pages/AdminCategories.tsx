import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { LoadingState } from "@/components/LoadingState";

interface Category {
  id: string;
  name: string;
  display_order: number;
  created_at: string;
}

export default function AdminCategories() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchCategories();
    }
  }, [isAdmin]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("department_categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast.error("Failed to load categories");
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    setCreating(true);
    try {
      const maxOrder = categories.reduce((max, cat) => Math.max(max, cat.display_order), 0);
      
      const { error } = await supabase
        .from("department_categories")
        .insert({
          name: newCategoryName.trim(),
          display_order: maxOrder + 1,
        });

      if (error) throw error;

      toast.success("Category created");
      setNewCategoryName("");
      fetchCategories();
    } catch (error: any) {
      toast.error("Failed to create category");
      console.error("Error creating category:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Delete category "${categoryName}"? Departments will be unlinked.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("department_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;

      toast.success("Category deleted");
      fetchCategories();
    } catch (error: any) {
      toast.error("Failed to delete category");
      console.error("Error deleting category:", error);
    }
  };

  if (adminLoading || loading) {
    return <LoadingState />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <PageHeader title="Department Categories" showBack
        backTo="/admin" />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Add New Category</h2>
            <div className="flex gap-2">
              <Input
                placeholder="Category name (e.g., Engineering, Sciences)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={creating}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Categories group departments for the signup page. They don't affect the Department page.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {categories.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No categories yet. Create one to group departments.
              </CardContent>
            </Card>
          ) : (
            categories.map((category) => (
              <Card key={category.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <span className="flex-1 font-medium">{category.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(category.id, category.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
          <SmartBottomNav />
    </div>
  );
}