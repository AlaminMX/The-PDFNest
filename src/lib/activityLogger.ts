import { supabase } from "@/integrations/supabase/client";

export type ActivityType = 
  | "login"
  | "logout"
  | "session_start"
  | "session_end"
  | "page_view"
  | "upload_pdf"
  | "delete_pdf"
  | "rename_pdf"
  | "download_pdf"
  | "view_pdf"
  | "open_pdf"
  | "ai_summary"
  | "ai_study_guide"
  | "ai_voice"
  | "ai_translate"
  | "ai_chat"
  | "category_create"
  | "category_delete"
  | "profile_update"
  | "avatar_update"
  | "lecture_note_upload"
  | "lecture_note_view";

interface ActivityDetails {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Log user activity to the database
 */
export async function logActivity(
  activityType: ActivityType,
  details?: ActivityDetails
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("user_activity_logs").insert({
      user_id: user.id,
      activity_type: activityType,
      details: details || {},
      user_agent: navigator.userAgent
    });
  } catch (error) {
    // Silently fail - activity logging should not break the app
    console.error("Failed to log activity:", error);
  }
}

/**
 * Get activity type display name
 */
export function getActivityDisplayName(activityType: string): string {
  const displayNames: Record<string, string> = {
    login: "Logged in",
    logout: "Logged out",
    session_start: "Started session",
    session_end: "Ended session",
    page_view: "Viewed page",
    upload_pdf: "Uploaded PDF",
    delete_pdf: "Deleted PDF",
    rename_pdf: "Renamed PDF",
    download_pdf: "Downloaded PDF",
    view_pdf: "Viewed PDF",
    open_pdf: "Opened PDF",
    ai_summary: "Generated AI Summary",
    ai_study_guide: "Generated Study Guide",
    ai_voice: "Used Voice Reader",
    ai_translate: "Translated PDF",
    ai_chat: "Chatted with PDF",
    category_create: "Created Category",
    category_delete: "Deleted Category",
    profile_update: "Updated Profile",
    avatar_update: "Updated Avatar",
    lecture_note_upload: "Uploaded Lecture Note",
    lecture_note_view: "Viewed Lecture Note"
  };

  return displayNames[activityType] || activityType;
}

/**
 * Get activity type icon name
 */
export function getActivityIcon(activityType: string): string {
  const icons: Record<string, string> = {
    login: "LogIn",
    logout: "LogOut",
    session_start: "Play",
    session_end: "Square",
    page_view: "Eye",
    upload_pdf: "Upload",
    delete_pdf: "Trash2",
    rename_pdf: "Edit2",
    download_pdf: "Download",
    view_pdf: "Eye",
    open_pdf: "FileText",
    ai_summary: "FileText",
    ai_study_guide: "BookOpen",
    ai_voice: "Volume2",
    ai_translate: "Languages",
    ai_chat: "MessageSquare",
    category_create: "FolderPlus",
    category_delete: "FolderMinus",
    profile_update: "User",
    avatar_update: "Image",
    lecture_note_upload: "FileUp",
    lecture_note_view: "GraduationCap"
  };

  return icons[activityType] || "Activity";
}
