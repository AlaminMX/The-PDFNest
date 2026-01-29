import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const SESSION_KEY = "pdfnest_session_id";
const LAST_ACTIVITY_KEY = "pdfnest_last_activity";
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

// Only log in development mode
const isDev = import.meta.env.DEV;
const log = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};

export type ActivityType = 
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

interface SessionActivity {
  type: ActivityType;
  timestamp: string;
  details?: ActivityDetails;
}

/**
 * Get current session ID from storage
 */
export function getCurrentSessionId(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

/**
 * Set current session ID in storage
 */
function setCurrentSessionId(sessionId: string): void {
  sessionStorage.setItem(SESSION_KEY, sessionId);
}

/**
 * Clear current session ID from storage
 */
function clearCurrentSessionId(): void {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(LAST_ACTIVITY_KEY);
}

/**
 * Update last activity timestamp
 */
function updateLastActivity(): void {
  sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

/**
 * Check if session is idle (exceeded timeout)
 */
function isSessionIdle(): boolean {
  const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivity) return false;
  return Date.now() - parseInt(lastActivity) > IDLE_TIMEOUT_MS;
}

/**
 * Create a new session when user logs in
 */
export async function startSession(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // End any existing active session first
    const existingSessionId = getCurrentSessionId();
    if (existingSessionId) {
      await endSession();
    }

    // Create new session
    const { data, error } = await supabase
      .from("user_sessions")
      .insert([{
        user_id: user.id,
        user_agent: navigator.userAgent,
        is_active: true,
        activities: [] as Json,
        activity_summary: {} as Json
      }])
      .select("id")
      .single();

    if (error) throw error;

    const sessionId = data.id;
    setCurrentSessionId(sessionId);
    updateLastActivity();

    log("Session started:", sessionId);
    return sessionId;
  } catch (error) {
    if (isDev) console.error("Failed to start session:", error);
    return null;
  }
}

/**
 * End the current session (on logout or idle timeout)
 */
export async function endSession(): Promise<void> {
  try {
    const sessionId = getCurrentSessionId();
    if (!sessionId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      clearCurrentSessionId();
      return;
    }

    // Get current session to calculate duration
    const { data: session } = await supabase
      .from("user_sessions")
      .select("login_at, activities")
      .eq("id", sessionId)
      .maybeSingle();

    if (session) {
      const activities = (Array.isArray(session.activities) ? session.activities : []) as unknown as SessionActivity[];
      const loginAt = new Date(session.login_at);
      const logoutAt = new Date();
      const durationSeconds = Math.floor((logoutAt.getTime() - loginAt.getTime()) / 1000);

      // Generate activity summary
      const summary = generateActivitySummary(activities);

      // Update session with logout info
      await supabase
        .from("user_sessions")
        .update({
          logout_at: logoutAt.toISOString(),
          duration_seconds: durationSeconds,
          is_active: false,
          activity_summary: summary
        })
        .eq("id", sessionId);
    }

    clearCurrentSessionId();
    log("Session ended:", sessionId);
  } catch (error) {
    if (isDev) console.error("Failed to end session:", error);
    clearCurrentSessionId();
  }
}

/**
 * Generate activity summary from activities array
 */
function generateActivitySummary(activities: SessionActivity[]): Record<string, number> {
  const summary: Record<string, number> = {};
  
  for (const activity of activities) {
    summary[activity.type] = (summary[activity.type] || 0) + 1;
  }
  
  return summary;
}

/**
 * Log activity to the current session
 */
export async function logActivity(
  activityType: ActivityType,
  details?: ActivityDetails
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check for idle timeout
    if (isSessionIdle()) {
      await endSession();
      await startSession();
    }

    let sessionId = getCurrentSessionId();
    
    // If no session exists, create one
    if (!sessionId) {
      sessionId = await startSession();
      if (!sessionId) return;
    }

    // Get current activities
    const { data: session } = await supabase
      .from("user_sessions")
      .select("activities")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session) {
      // Session doesn't exist, create new one
      sessionId = await startSession();
      if (!sessionId) return;
    }

    const currentActivities = (Array.isArray(session?.activities) ? session.activities : []) as unknown as SessionActivity[];
    
    // Add new activity
    const newActivity: SessionActivity = {
      type: activityType,
      timestamp: new Date().toISOString(),
      details
    };

    // Update session with new activity
    const updatedActivities = [...currentActivities, newActivity];
    await supabase
      .from("user_sessions")
      .update({
        activities: updatedActivities as unknown as Json
      })
      .eq("id", sessionId);

    updateLastActivity();
  } catch (error) {
    if (isDev) console.error("Failed to log activity:", error);
  }
}

/**
 * Get activity type display name
 */
export function getActivityDisplayName(activityType: string): string {
  const displayNames: Record<string, string> = {
    page_view: "Viewed Page",
    upload_pdf: "Uploaded PDF",
    delete_pdf: "Deleted PDF",
    rename_pdf: "Renamed PDF",
    download_pdf: "Downloaded PDF",
    view_pdf: "Viewed PDF",
    open_pdf: "Opened PDF",
    ai_summary: "AI Summary",
    ai_study_guide: "Study Guide",
    ai_voice: "Voice Reader",
    ai_translate: "Translated PDF",
    ai_chat: "Chat with PDF",
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
 * Format duration in seconds to human readable string
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Set up idle detection for automatic session ending
 */
export function setupIdleDetection(): () => void {
  let idleCheckInterval: NodeJS.Timeout;

  const checkIdle = async () => {
    if (isSessionIdle() && getCurrentSessionId()) {
      log("Session idle timeout reached, ending session");
      await endSession();
    }
  };

  // Check every minute
  idleCheckInterval = setInterval(checkIdle, 60000);

  // Update activity on user interaction
  const handleActivity = () => updateLastActivity();
  
  window.addEventListener("click", handleActivity);
  window.addEventListener("keydown", handleActivity);
  window.addEventListener("scroll", handleActivity);

  // Handle page unload
  const handleUnload = () => {
    endSession();
  };
  
  window.addEventListener("beforeunload", handleUnload);

  return () => {
    clearInterval(idleCheckInterval);
    window.removeEventListener("click", handleActivity);
    window.removeEventListener("keydown", handleActivity);
    window.removeEventListener("scroll", handleActivity);
    window.removeEventListener("beforeunload", handleUnload);
  };
}
