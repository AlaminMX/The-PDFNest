import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Category {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

const DEFAULT_CATEGORIES = [
  { id: "uncategorized", name: "Uncategorized", color: "bg-gray-100 text-gray-700" },
  { id: "work", name: "Work", color: "bg-red-100 text-red-700" },
  { id: "personal", name: "Personal", color: "bg-blue-100 text-blue-700" },
  { id: "finance", name: "Finance", color: "bg-green-100 text-green-700" },
];

export function useCategories(userId: string | undefined) {
  const [categories, setCategories] = useState<any[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Check if user has default categories
      if (!data || data.length === 0) {
        // Create default categories for new user
        const defaultCatsToInsert = DEFAULT_CATEGORIES.slice(1).map((cat) => ({
          user_id: userId,
          name: cat.name,
          color: cat.color,
        }));

        const { data: inserted } = await supabase
          .from("categories")
          .insert(defaultCatsToInsert)
          .select();

        setCategories([DEFAULT_CATEGORIES[0], ...(inserted || [])]);
      } else {
        setCategories([DEFAULT_CATEGORIES[0], ...data]);
      }
    } catch (error: any) {
      toast.error("Failed to load categories");
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [userId]);

  const addCategory = async (name: string, color: string) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({ user_id: userId, name, color })
        .select()
        .single();

      if (error) throw error;

      setCategories([...categories, data]);
      toast.success("Category created");
    } catch (error: any) {
      toast.error("Failed to create category");
      console.error("Error creating category:", error);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!userId || categoryId === "uncategorized") return;

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;

      setCategories(categories.filter((c) => c.id !== categoryId));
      toast.success("Category deleted");
    } catch (error: any) {
      toast.error("Failed to delete category");
      console.error("Error deleting category:", error);
    }
  };

  return { categories, loading, addCategory, deleteCategory, refreshCategories: loadCategories };
}
