import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "pdfnest_session_id";
const LAST_ACTIVITY_KEY = "pdfnest_last_activity";
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

const REDACT_KEYS = [
  "password",
  "token",
  "secret",
  "api_key",
  "apikey",
  "authorization",
  "email",
  "phone",
  "cookie",
  "access_token",
  "refresh_token",
];

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
  | "lecture_note_view"
  | "login_success"
  | "login_failed"
  | "logout"
  | "session_start"
  | "session_end";

interface ActivityDetails {
  [key: string]: string | number | boolean | null | undefined;
}

interface StructuredLogPayload {
  timestamp: string;
  user_id: string;
  session_id: string;
  action: string;
  resource: string;
  status: string;
  context: Record<string, unknown>;
}

function sanitizeContext(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((entry) => sanitizeContext(entry));
  }

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, rawVal] of Object.entries(value as Record<string, unknown>)) {
      if (REDACT_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        output[key] = "[REDACTED]";
        continue;
      }
      output[key] = sanitizeContext(rawVal);
    }
    return output;
  }

  if (typeof value === "string" && value.length > 2000) {
    return `${value.slice(0, 2000)}...[truncated]`;
  }

  return value;
}

function nowIsoUtc(): string {
  return new Date().toISOString();
}

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setCurrentSessionId(sessionId: string): void {
  sessionStorage.setItem(SESSION_KEY, sessionId);
}

export function getCurrentSessionId(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

function clearCurrentSessionId(): void {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(LAST_ACTIVITY_KEY);
}

function updateLastActivity(): void {
  sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

function isSessionIdle(): boolean {
  const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivity) return false;

  return Date.now() - Number(lastActivity) > IDLE_TIMEOUT_MS;
}

function mapActivityTypeToAction(activityType: ActivityType): string {
  const map: Record<ActivityType, string> = {
    page_view: "PAGE_VIEW",
    upload_pdf: "FILE_UPLOAD",
    delete_pdf: "FILE_DELETE",
    rename_pdf: "FILE_RENAME",
    download_pdf: "FILE_DOWNLOAD",
    view_pdf: "PDF_VIEW",
    open_pdf: "PDF_OPEN",
    ai_summary: "AI_SUMMARY_GENERATE",
    ai_study_guide: "AI_STUDY_GUIDE_GENERATE",
    ai_voice: "AI_VOICE_GENERATE",
    ai_translate: "AI_TRANSLATE_GENERATE",
    ai_chat: "AI_CHAT_ASK",
    category_create: "CATEGORY_CREATE",
    category_delete: "CATEGORY_DELETE",
    profile_update: "PROFILE_UPDATE",
    avatar_update: "AVATAR_UPDATE",
    lecture_note_upload: "LECTURE_NOTE_UPLOAD",
    lecture_note_view: "LECTURE_NOTE_VIEW",
    login_success: "LOGIN_SUCCESS",
    login_failed: "LOGIN_FAILED",
    logout: "LOGOUT",
    session_start: "SESSION_START",
    session_end: "SESSION_END",
  };

  return map[activityType] ?? "UNKNOWN";
}

async function sendActivityLog(payload: StructuredLogPayload): Promise<void> {
  const safePayload: StructuredLogPayload = {
    ...payload,
    context: (sanitizeContext(payload.context) as Record<string, unknown>) || {},
  };

  const { error } = await supabase.functions.invoke("activity-log", {
    body: safePayload,
  });

  if (error && import.meta.env.DEV) {
    console.error("activity-log invoke failed", error);
  }
}

export async function startSession(): Promise<string | null> {
  const existing = getCurrentSessionId();
  if (existing && !isSessionIdle()) {
    updateLastActivity();
    return existing;
  }

  if (existing) {
    await endSession();
  }

  const sessionId = generateSessionId();
  setCurrentSessionId(sessionId);
  updateLastActivity();

  const { data: { user } } = await supabase.auth.getUser();

  await sendActivityLog({
    timestamp: nowIsoUtc(),
    user_id: user?.id ?? "guest",
    session_id: sessionId,
    action: "SESSION_START",
    resource: window.location.pathname,
    status: "SUCCESS",
    context: {
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
    },
  });

  return sessionId;
}

export async function endSession(): Promise<void> {
  const sessionId = getCurrentSessionId();
  if (!sessionId) return;

  const { data: { user } } = await supabase.auth.getUser();

  await sendActivityLog({
    timestamp: nowIsoUtc(),
    user_id: user?.id ?? "guest",
    session_id: sessionId,
    action: "SESSION_END",
    resource: window.location.pathname,
    status: "SUCCESS",
    context: {
      reason: isSessionIdle() ? "IDLE_TIMEOUT" : "USER_OR_NAVIGATION_END",
    },
  });

  clearCurrentSessionId();
}

export async function logActivity(activityType: ActivityType, details?: ActivityDetails): Promise<void> {
  if (isSessionIdle() && getCurrentSessionId()) {
    await endSession();
  }

  let sessionId = getCurrentSessionId();
  if (!sessionId) {
    sessionId = await startSession();
  }

  if (!sessionId) return;

  const { data: { user } } = await supabase.auth.getUser();

  await sendActivityLog({
    timestamp: nowIsoUtc(),
    user_id: user?.id ?? "guest",
    session_id: sessionId,
    action: mapActivityTypeToAction(activityType),
    resource: window.location.pathname,
    status: "SUCCESS",
    context: {
      ...(details || {}),
      activity_type: activityType,
      user_agent: navigator.userAgent,
    },
  });

  updateLastActivity();
}

export function getActivityDisplayName(activityType: string): string {
  const displayNames: Record<string, string> = {
    PAGE_VIEW: "Viewed Page",
    FILE_UPLOAD: "Uploaded PDF",
    FILE_DELETE: "Deleted PDF",
    FILE_RENAME: "Renamed PDF",
    FILE_DOWNLOAD: "Downloaded PDF",
    PDF_VIEW: "Viewed PDF",
    PDF_OPEN: "Opened PDF",
    AI_SUMMARY_GENERATE: "AI Summary",
    AI_STUDY_GUIDE_GENERATE: "Study Guide",
    AI_VOICE_GENERATE: "Voice Reader",
    AI_TRANSLATE_GENERATE: "Translated PDF",
    AI_CHAT_ASK: "Chat with PDF",
    CATEGORY_CREATE: "Created Category",
    CATEGORY_DELETE: "Deleted Category",
    PROFILE_UPDATE: "Updated Profile",
    AVATAR_UPDATE: "Updated Avatar",
    LECTURE_NOTE_UPLOAD: "Uploaded Lecture Note",
    LECTURE_NOTE_VIEW: "Viewed Lecture Note",
    LOGIN_SUCCESS: "Login Success",
    LOGIN_FAILED: "Login Failed",
    LOGOUT: "Logged Out",
    SESSION_START: "Session Started",
    SESSION_END: "Session Ended",
  };

  return displayNames[activityType] || activityType;
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;

  return `${secs}s`;
}

export function setupIdleDetection(): () => void {
  let idleCheckInterval: number;

  const checkIdle = async () => {
    if (isSessionIdle() && getCurrentSessionId()) {
      await endSession();
    }
  };

  idleCheckInterval = window.setInterval(checkIdle, 60000);

  const handleActivity = () => updateLastActivity();
  const handleUnload = () => {
    const sessionId = getCurrentSessionId();
    if (!sessionId) return;

    const payload = {
      timestamp: nowIsoUtc(),
      user_id: "guest",
      session_id: sessionId,
      action: "SESSION_END",
      resource: window.location.pathname,
      status: "SUCCESS",
      context: { reason: "PAGE_UNLOAD" },
    };

    navigator.sendBeacon(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activity-log`,
      JSON.stringify(payload),
    );

    clearCurrentSessionId();
  };

  window.addEventListener("click", handleActivity);
  window.addEventListener("keydown", handleActivity);
  window.addEventListener("scroll", handleActivity);
  window.addEventListener("beforeunload", handleUnload);

  return () => {
    window.clearInterval(idleCheckInterval);
    window.removeEventListener("click", handleActivity);
    window.removeEventListener("keydown", handleActivity);
    window.removeEventListener("scroll", handleActivity);
    window.removeEventListener("beforeunload", handleUnload);
  };
}
