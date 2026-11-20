interface FacultyBackground {
  name: string;
  background_image_url?: string | null;
}

function getDefaultFacultyBackground(name: string) {
  const faculty = name.toLowerCase();
  if (/\bcomputing\b/.test(faculty)) return "/faculty-backgrounds/computing.webp";
  if (/\bengineering\b/.test(faculty)) return "/faculty-backgrounds/engineering.webp";
  if (/\bsocial\b/.test(faculty) && /\bmanagement\b/.test(faculty)) {
    return "/faculty-backgrounds/social-management.webp";
  }
  return undefined;
}

export function getFacultyBackground(faculty: FacultyBackground) {
  // Null means no image was configured. An empty string records an explicit removal.
  return faculty.background_image_url == null
    ? getDefaultFacultyBackground(faculty.name)
    : faculty.background_image_url.trim() || undefined;
}
