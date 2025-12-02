import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RepStatus {
  isRep: boolean;
  departmentId: string | null;
  departmentName: string | null;
  displayName: string | null;
  isInsider: boolean;
  avatarUrl: string | null;
}

export function useRepStatus() {
  const [status, setStatus] = useState<RepStatus>({
    isRep: false,
    departmentId: null,
    departmentName: null,
    displayName: null,
    isInsider: false,
    avatarUrl: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRepStatus();
  }, []);

  const checkRepStatus = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus({
          isRep: false,
          departmentId: null,
          departmentName: null,
          displayName: null,
          isInsider: false,
          avatarUrl: null,
        });
        setLoading(false);
        return;
      }

      // Check if user has rep role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "rep")
        .maybeSingle();

      if (!roleData) {
        setStatus({
          isRep: false,
          departmentId: null,
          departmentName: null,
          displayName: null,
          isInsider: false,
          avatarUrl: null,
        });
        setLoading(false);
        return;
      }

      // Fetch profile with department info
      const { data: profile } = await supabase
        .from("profiles")
        .select(`
          department_id,
          display_name,
          is_insider,
          avatar_url,
          departments (
            name
          )
        `)
        .eq("id", user.id)
        .single();

      if (profile) {
        setStatus({
          isRep: true,
          departmentId: profile.department_id,
          departmentName: (profile.departments as any)?.name || null,
          displayName: profile.display_name,
          isInsider: profile.is_insider || false,
          avatarUrl: profile.avatar_url,
        });
      }
    } catch (err) {
      console.error("Error checking rep status:", err);
    } finally {
      setLoading(false);
    }
  };

  return { ...status, loading, refresh: checkRepStatus };
}
