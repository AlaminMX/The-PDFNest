import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRepStatus() {
  const [isRep, setIsRep] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRepStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsRep(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "rep")
          .maybeSingle();

        if (error) {
          console.error("Error checking rep status:", error);
          setIsRep(false);
        } else {
          setIsRep(!!data);
        }
      } catch (error) {
        console.error("Error in checkRepStatus:", error);
        setIsRep(false);
      } finally {
        setLoading(false);
      }
    };

    checkRepStatus();
  }, []);

  return { isRep, loading };
}
