import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEPT_CACHE_KEY = "pdfnest_dept_status";

interface DeptCache {
  hasDepartment: boolean;
  departmentId: string | null;
  departmentName: string | null;
  userId: string;
  timestamp: number;
}

interface UserDepartmentData {
  departmentId: string | null;
  departmentName: string | null;
  hasDepartment: boolean;
  loading: boolean;
  resolved: boolean;
  refresh: () => Promise<void>;
}

function getCachedDept(userId: string): DeptCache | null {
  try {
    const cached = localStorage.getItem(DEPT_CACHE_KEY);
    if (!cached) return null;
    const parsed: DeptCache = JSON.parse(cached);
    // Cache valid for 24 hours and must match userId
    if (parsed.userId === userId && Date.now() - parsed.timestamp < 86400000) {
      return parsed;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function setCachedDept(userId: string, departmentId: string | null, departmentName: string | null) {
  const cache: DeptCache = {
    hasDepartment: !!departmentId,
    departmentId,
    departmentName,
    userId,
    timestamp: Date.now(),
  };
  localStorage.setItem(DEPT_CACHE_KEY, JSON.stringify(cache));
}

export function useUserDepartment(userId: string | undefined): UserDepartmentData {
  // Initialize from cache immediately to prevent flash
  const cachedData = userId ? getCachedDept(userId) : null;
  
  const [departmentId, setDepartmentId] = useState<string | null>(cachedData?.departmentId ?? null);
  const [departmentName, setDepartmentName] = useState<string | null>(cachedData?.departmentName ?? null);
  const [loading, setLoading] = useState(!cachedData);
  const [resolved, setResolved] = useState(!!cachedData);

  const fetchDepartment = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setResolved(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          department_id,
          departments (
            name
          )
        `)
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      const deptId = data?.department_id || null;
      const deptName = data?.departments?.name || null;
      
      setDepartmentId(deptId);
      setDepartmentName(deptName);
      setCachedDept(userId, deptId, deptName);
    } catch (error) {
      console.error("Error fetching user department:", error);
    } finally {
      setLoading(false);
      setResolved(true);
    }
  }, [userId]);

  useEffect(() => {
    fetchDepartment();
  }, [fetchDepartment]);

  return {
    departmentId,
    departmentName,
    hasDepartment: !!departmentId,
    loading,
    resolved,
    refresh: fetchDepartment,
  };
}
