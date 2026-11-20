import type { Json } from "@/integrations/supabase/types";

export type EventGroup = "Reading" | "Downloads" | "Uploads" | "Browsing" | "Account" | "Other";
export const groups: EventGroup[] = ["Reading", "Downloads", "Uploads", "Browsing", "Account", "Other"];
const eventTypes: Record<string, [string, EventGroup]> = {
  DOCUMENT_PUBLISHED: ["Published a document", "Uploads"],
  DOCUMENT_COPIED: ["Copied a document", "Other"],
  PAGE_VIEW: ["Visited a page", "Browsing"],
  PDF_VIEW: ["Opened a PDF", "Reading"],
  PDF_OPEN: ["Opened a PDF", "Reading"],
  VIEW_PDF: ["Opened a PDF", "Reading"],
  OPEN_PDF: ["Opened a PDF", "Reading"],
  LECTURE_NOTE_VIEW: ["Opened a lecture note", "Reading"],
  FILE_DOWNLOAD: ["Downloaded a PDF", "Downloads"],
  DOWNLOAD_PDF: ["Downloaded a PDF", "Downloads"],
  FILE_UPLOAD: ["Uploaded a PDF", "Uploads"],
  UPLOAD_PDF: ["Uploaded a PDF", "Uploads"],
  LECTURE_NOTE_UPLOAD: ["Uploaded a lecture note", "Uploads"],
  CONTRIBUTE_UPLOAD: ["Submitted material for review", "Uploads"],
  LOGIN: ["Signed in", "Account"],
  LOGIN_SUCCESS: ["Signed in", "Account"],
  LOGIN_FAILED: ["Sign-in failed", "Account"],
  LOGOUT: ["Signed out", "Account"],
  SESSION_START: ["Started a session", "Account"],
  SESSION_END: ["Ended a session", "Account"],
};

function object(value: Json | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

const namedPages: Record<string, string> = {
  "/": "PDFNest home",
  "/dashboard": "Personal PDF library",
  "/profile": "Account profile",
  "/onboarding": "Account setup",
  "/auth": "Sign-in and registration",
  "/afit-pdfs": "AFIT library faculties",
  "/contribute": "Submit material",
  "/rep/upload": "Representative uploads",
  "/past-questions": "Past question levels",
  "/projects": "Final year projects",
  "/leaderboard": "Contributor leaderboard",
  "/notifications": "Notifications",
  "/terms": "Terms of service",
  "/privacy": "Privacy policy",
  "/reset-password": "Reset password",
  "/reset-password-success": "Password reset confirmation",
  "/admin": "Admin dashboard",
  "/admin/activity": "Admin activity",
  "/admin/uploads": "Admin upload review",
  "/admin/departments": "Admin departments",
  "/admin/faculties": "Admin faculties",
  "/admin/categories": "Admin categories",
  "/admin/reps": "Admin representatives",
  "/admin/banners": "Admin banners",
  "/admin/projects": "Admin final year projects",
  "/admin/past-questions": "Admin past questions",
};

function decodeSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function humanize(segment: string) {
  return decodeSegment(segment).replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatActivityPage(route: string) {
  const path = route.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (namedPages[path]) return namedPages[path];

  const [area, ...parts] = path.split("/").filter(Boolean);
  if (area === "afit-pdfs") {
    const [faculty, department, levelMarker, level, semesterMarker, semester, course] = parts;
    if (faculty && !department) return `${humanize(faculty)} faculty departments`;
    if (department) {
      const name = humanize(department);
      if (levelMarker && levelMarker !== "level") return `${name} · ${humanize(levelMarker)}`;
      if (!level) return `${name} levels`;
      if (semesterMarker !== "semester" || !semester) return `${name} · ${level}L semesters`;
      const term = `${name} · ${level}L · ${humanize(semester)} semester`;
      return course ? `${term} · ${decodeSegment(course)} materials` : `${term} courses`;
    }
  }
  if (area === "past-questions" && parts[0] === "level" && parts[1]) {
    const [, level, , semester, course] = parts;
    return [`Past questions · ${level}L`, semester && `${humanize(semester)} semester`, course && decodeSegment(course)].filter(Boolean).join(" · ");
  }
  if (area === "rep") return "Representative profile";
  if (area === "user") return "Public profile";
  if (area === "admin" && parts[0] === "user") return "Admin account details";
  if (area === "admin" && parts[0] === "departments") return "Admin department levels";
  return "Unrecognised page";
}

export function formatActivity(type: string, details: Json | null) {
  const action = type.toUpperCase();
  const [label, group] = eventTypes[action] ??
    [type.toLowerCase().replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase()), "Other" as const];

  const metadata = object(details);
  const context = object(metadata.context);
  const fields = { ...metadata, ...context, ...object(context.details) };
  if (action === "PAGE_VIEW") {
    const route = [fields.path, fields.page, metadata.resource].find((value): value is string =>
      typeof value === "string" && value.startsWith("/"),
    );
    return { label: route ? `Visited ${formatActivityPage(route)}` : label, group, detail: null };
  }
  const title = [fields.title, fields.fileName, fields.newName].find((value): value is string =>
    typeof value === "string" && !!value,
  );
  const detail = [title, fields.courseCode, fields.destination].filter((value) => typeof value === "string" && value).join(" · ");
  return { label, group, detail: detail || null };
}
