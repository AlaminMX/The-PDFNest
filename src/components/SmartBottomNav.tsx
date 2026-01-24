import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "./BottomNav";
import { RepBottomNav } from "./RepBottomNav";

export function SmartBottomNav() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isRep, setIsRep] = useState<boolean | null>(null);
  const [hasDepartment, setHasDepartment] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUserAndRepStatus();
  }, []);

  const checkUserAndRepStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUserId(null);
        setIsRep(false);
        setHasDepartment(true);
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      // Check rep role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "rep")
        .maybeSingle();

      const repStatus = !!roleData;
      setIsRep(repStatus);

      // Check department
      const { data: profileData } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", user.id)
        .maybeSingle();

      const deptStatus = !!profileData?.department_id;
      setHasDepartment(deptStatus);

      setIsLoading(false);
    } catch (error) {
      console.error("Error checking user status:", error);
      setIsLoading(false);
    }
  };

  // Keep layout stable: render a non-personalized nav while status loads.
  if (isLoading) {
    return <BottomNav isLoggedIn={false} showProfileDot={false} />;
  }

  // Rep users get RepBottomNav
  if (isRep && userId) {
    return <RepBottomNav repUserId={userId} />;
  }

  // Regular users and guests get BottomNav
  // Show notification dot only if user is logged in but has no department
  const showDot = !!userId && !hasDepartment;
  return <BottomNav isLoggedIn={!!userId} userId={userId || undefined} showProfileDot={showDot} />;
}
