import { supabase } from "@/integrations/supabase/client";

export async function hasCompletedOnboarding(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.onboarding_complete === true;
}

export function takePostLoginDestination() {
  const destination = sessionStorage.getItem("redirectAfterLogin");
  sessionStorage.removeItem("redirectAfterLogin");
  if (destination?.startsWith("/") && !destination.startsWith("//") && !destination.includes("\\")) {
    const url = new URL(destination, window.location.origin);
    const path = url.pathname.replace(/\/+$/, "").toLowerCase();
    if (url.origin === window.location.origin && path !== "/onboarding" && path !== "/auth") return destination;
  }
  return "/dashboard";
}
