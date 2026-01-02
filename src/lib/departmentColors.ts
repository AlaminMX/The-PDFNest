/**
 * Department Color & Icon System
 * Handles color normalization, enhancement, and icon styling for departments
 */

// HSL color type
interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

// Parsed color result
interface ParsedColor {
  hsl: HSLColor;
  isExact: boolean; // true if parsed from exact code, false if from name
}

// Color output for styling
export interface DepartmentColorStyles {
  // Background colors
  bgLight: string;      // Light mode bg
  bgHover: string;      // Hover state
  // Accent colors
  accentBg: string;     // Icon background
  accentText: string;   // Text color matching theme
  // Glow effect
  glowColor: string;    // Shadow/glow color
  glowIntense: string;  // Intense glow for icon
  // Contrast-safe text
  textOnBg: string;     // Text color ensuring contrast
  // Raw HSL for custom usage
  hsl: HSLColor;
  cssHsl: string;       // CSS hsl() format
}

// Named color mappings with HSL values (wide spectrum)
const namedColors: Record<string, HSLColor> = {
  // Blues
  blue: { h: 217, s: 91, l: 60 },
  "sky blue": { h: 197, s: 71, l: 73 },
  "light blue": { h: 199, s: 89, l: 48 },
  "dark blue": { h: 224, s: 76, l: 48 },
  navy: { h: 240, s: 64, l: 27 },
  azure: { h: 210, s: 100, l: 50 },
  cobalt: { h: 215, s: 100, l: 50 },
  
  // Greens
  green: { h: 142, s: 76, l: 36 },
  emerald: { h: 160, s: 84, l: 39 },
  "light green": { h: 120, s: 60, l: 50 },
  "dark green": { h: 120, s: 100, l: 25 },
  lime: { h: 84, s: 81, l: 44 },
  mint: { h: 150, s: 60, l: 60 },
  teal: { h: 174, s: 84, l: 32 },
  jade: { h: 158, s: 56, l: 42 },
  forest: { h: 140, s: 60, l: 28 },
  
  // Reds
  red: { h: 0, s: 84, l: 60 },
  crimson: { h: 348, s: 83, l: 47 },
  scarlet: { h: 5, s: 90, l: 52 },
  maroon: { h: 0, s: 100, l: 25 },
  rose: { h: 350, s: 89, l: 60 },
  ruby: { h: 337, s: 80, l: 48 },
  
  // Oranges
  orange: { h: 25, s: 95, l: 53 },
  tangerine: { h: 28, s: 100, l: 55 },
  coral: { h: 16, s: 100, l: 66 },
  peach: { h: 28, s: 100, l: 75 },
  amber: { h: 45, s: 93, l: 47 },
  
  // Yellows
  yellow: { h: 48, s: 96, l: 53 },
  gold: { h: 51, s: 100, l: 50 },
  golden: { h: 43, s: 96, l: 56 },
  lemon: { h: 54, s: 100, l: 62 },
  
  // Purples
  purple: { h: 271, s: 81, l: 56 },
  violet: { h: 258, s: 90, l: 66 },
  lavender: { h: 270, s: 67, l: 75 },
  indigo: { h: 239, s: 84, l: 67 },
  plum: { h: 300, s: 47, l: 42 },
  magenta: { h: 300, s: 100, l: 50 },
  
  // Pinks
  pink: { h: 330, s: 81, l: 60 },
  "hot pink": { h: 330, s: 100, l: 50 },
  salmon: { h: 6, s: 93, l: 71 },
  fuchsia: { h: 292, s: 84, l: 61 },
  
  // Cyans
  cyan: { h: 188, s: 78, l: 41 },
  aqua: { h: 180, s: 100, l: 50 },
  turquoise: { h: 174, s: 72, l: 56 },
  
  // Neutrals
  silver: { h: 210, s: 14, l: 72 },
  gray: { h: 210, s: 10, l: 58 },
  grey: { h: 210, s: 10, l: 58 },
  charcoal: { h: 210, s: 10, l: 30 },
  slate: { h: 215, s: 25, l: 45 },
  
  // Browns
  brown: { h: 30, s: 59, l: 33 },
  chocolate: { h: 25, s: 75, l: 30 },
  bronze: { h: 30, s: 62, l: 45 },
  copper: { h: 27, s: 68, l: 52 },
  tan: { h: 34, s: 44, l: 69 },
  
  // Others
  black: { h: 0, s: 0, l: 10 },
  white: { h: 0, s: 0, l: 95 },
};

// Parse HEX to HSL
function hexToHsl(hex: string): HSLColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    // Try 3-digit hex
    const shortResult = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
    if (!shortResult) return null;
    const r = parseInt(shortResult[1] + shortResult[1], 16) / 255;
    const g = parseInt(shortResult[2] + shortResult[2], 16) / 255;
    const b = parseInt(shortResult[3] + shortResult[3], 16) / 255;
    return rgbToHsl(r, g, b);
  }
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  return rgbToHsl(r, g, b);
}

// Parse RGB to HSL
function rgbToHsl(r: number, g: number, b: number): HSLColor {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Parse CSS rgb() format
function parseRgbString(rgb: string): HSLColor | null {
  const match = rgb.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) return null;
  return rgbToHsl(
    parseInt(match[1]) / 255,
    parseInt(match[2]) / 255,
    parseInt(match[3]) / 255
  );
}

// Parse CSS hsl() format
function parseHslString(hsl: string): HSLColor | null {
  const match = hsl.match(/hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/i);
  if (!match) return null;
  return {
    h: parseInt(match[1]),
    s: parseInt(match[2]),
    l: parseInt(match[3]),
  };
}

// Parse any color input
function parseColorInput(input: string): ParsedColor | null {
  const trimmed = input.trim().toLowerCase();
  
  // Try HEX
  if (trimmed.startsWith("#") || /^[a-f0-9]{3,6}$/i.test(trimmed)) {
    const hex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    const hsl = hexToHsl(hex);
    if (hsl) return { hsl, isExact: true };
  }
  
  // Try RGB
  if (trimmed.startsWith("rgb")) {
    const hsl = parseRgbString(trimmed);
    if (hsl) return { hsl, isExact: true };
  }
  
  // Try HSL
  if (trimmed.startsWith("hsl")) {
    const hsl = parseHslString(trimmed);
    if (hsl) return { hsl, isExact: true };
  }
  
  // Try named color (exact match first)
  if (namedColors[trimmed]) {
    return { hsl: namedColors[trimmed], isExact: false };
  }
  
  // Try partial match for named colors
  for (const [name, hsl] of Object.entries(namedColors)) {
    if (trimmed.includes(name) || name.includes(trimmed)) {
      return { hsl, isExact: false };
    }
  }
  
  return null;
}

// Enhance color vibrancy (increase saturation slightly)
function enhanceVibrancy(hsl: HSLColor, isExact: boolean): HSLColor {
  return {
    h: hsl.h,
    // Boost saturation more for exact colors, moderate for named
    s: Math.min(100, hsl.s + (isExact ? 10 : 15)),
    // Keep lightness in sweet spot for vibrancy
    l: Math.max(35, Math.min(65, hsl.l)),
  };
}

// Track used hues for auto-generation
const usedHues: Set<number> = new Set();

// Generate a unique vibrant color
function generateUniqueColor(index: number): HSLColor {
  // Golden angle distribution for max separation
  const goldenAngle = 137.508;
  let hue = (index * goldenAngle) % 360;
  
  // Adjust if too close to used hues
  let attempts = 0;
  while (attempts < 12) {
    const tooClose = Array.from(usedHues).some(
      (usedHue) => Math.abs(usedHue - hue) < 25 || Math.abs(usedHue - hue) > 335
    );
    if (!tooClose) break;
    hue = (hue + 30) % 360;
    attempts++;
  }
  
  usedHues.add(Math.round(hue));
  
  return {
    h: Math.round(hue),
    s: 75 + (index % 3) * 8, // 75-91% saturation
    l: 50 + (index % 2) * 8, // 50-58% lightness
  };
}

// Calculate relative luminance for contrast
function getLuminance(hsl: HSLColor): number {
  const l = hsl.l / 100;
  return l;
}

// Determine if text should be light or dark for contrast
function getContrastTextColor(bgHsl: HSLColor): "light" | "dark" {
  const { h, s, l } = bgHsl;
  
  // For very saturated colors, we need to be more careful
  if (s > 70) {
    return l < 55 ? "light" : "dark";
  }
  
  return l < 50 ? "light" : "dark";
}

// Main function: Get department color styles
export function getDepartmentStyles(
  colorInput: string | null,
  index: number = 0
): DepartmentColorStyles {
  let hsl: HSLColor;
  let isExact = false;
  
  if (colorInput && colorInput.trim()) {
    const parsed = parseColorInput(colorInput);
    if (parsed) {
      hsl = enhanceVibrancy(parsed.hsl, parsed.isExact);
      isExact = parsed.isExact;
    } else {
      hsl = generateUniqueColor(index);
    }
  } else {
    hsl = generateUniqueColor(index);
  }
  
  const { h, s, l } = hsl;
  const textMode = getContrastTextColor(hsl);
  
  return {
    // Light translucent background
    bgLight: `hsla(${h}, ${s}%, ${l}%, 0.08)`,
    bgHover: `hsla(${h}, ${s}%, ${l}%, 0.12)`,
    
    // Accent for icons
    accentBg: `hsla(${h}, ${s}%, ${l}%, 0.15)`,
    accentText: `hsl(${h}, ${Math.min(s + 10, 100)}%, ${textMode === "dark" ? Math.max(l - 15, 25) : Math.min(l + 10, 75)}%)`,
    
    // Glow effects - reduced intensity
    glowColor: `hsla(${h}, ${s}%, ${l}%, 0.15)`,
    glowIntense: `hsla(${h}, ${Math.min(s + 20, 100)}%, ${Math.min(l + 15, 75)}%, 0.25)`,
    
    // Contrast text
    textOnBg: textMode === "dark" 
      ? `hsl(${h}, ${Math.max(s - 30, 10)}%, 25%)`
      : `hsl(${h}, ${Math.max(s - 30, 10)}%, 95%)`,
    
    // Raw values
    hsl,
    cssHsl: `hsl(${h}, ${s}%, ${l}%)`,
  };
}

// Icon glow styling
export interface IconGlowStyles {
  filter: string;
  textShadow: string;
  transform: string;
}

export function getIconGlowStyles(hsl: HSLColor): IconGlowStyles {
  const { h, s, l } = hsl;
  // Reduced glow intensity
  const glowColor = `hsla(${h}, ${Math.min(s + 20, 100)}%, ${Math.min(l + 20, 80)}%, 0.3)`;
  const glowColorLight = `hsla(${h}, ${Math.min(s + 30, 100)}%, ${Math.min(l + 30, 90)}%, 0.2)`;
  
  return {
    filter: `drop-shadow(0 0 4px ${glowColor}) drop-shadow(0 1px 2px rgba(0,0,0,0.08))`,
    textShadow: `0 0 6px ${glowColor}, 0 0 12px ${glowColorLight}`,
    transform: "scale(1.02)",
  };
}

// Auto-generate icon based on department name
const iconKeywords: Record<string, string> = {
  computer: "💻",
  computing: "💻",
  software: "💻",
  programming: "💻",
  cyber: "🔒",
  security: "🛡️",
  engineering: "⚙️",
  mechanical: "🔧",
  electrical: "⚡",
  electronic: "📡",
  civil: "🏗️",
  science: "🔬",
  math: "📐",
  mathematics: "📐",
  physics: "⚛️",
  chemistry: "🧪",
  biology: "🧬",
  medicine: "🏥",
  medical: "🏥",
  health: "❤️",
  nursing: "👩‍⚕️",
  pharmacy: "💊",
  law: "⚖️",
  legal: "⚖️",
  business: "💼",
  management: "📈",
  economics: "📊",
  finance: "💰",
  accounting: "🧮",
  art: "🎨",
  design: "🎨",
  music: "🎵",
  theatre: "🎭",
  history: "📜",
  language: "🗣️",
  english: "📖",
  literature: "📚",
  education: "📚",
  teaching: "👨‍🏫",
  psychology: "🧠",
  sociology: "👥",
  political: "🏛️",
  philosophy: "💭",
  geography: "🌍",
  environmental: "🌱",
  agriculture: "🌾",
  architecture: "🏛️",
  aviation: "✈️",
  aerospace: "🚀",
  marine: "🌊",
  military: "🎖️",
  defense: "🛡️",
  communication: "📱",
  media: "📺",
  journalism: "📰",
  sports: "⚽",
  physical: "🏃",
  food: "🍽️",
  nutrition: "🥗",
  hospitality: "🏨",
  tourism: "🗺️",
};

export function getDepartmentIcon(iconInput: string | null, departmentName: string): string {
  // Use provided icon if available
  if (iconInput && iconInput.trim()) {
    return iconInput.trim();
  }
  
  // Auto-assign based on department name
  const nameLower = departmentName.toLowerCase();
  for (const [keyword, emoji] of Object.entries(iconKeywords)) {
    if (nameLower.includes(keyword)) {
      return emoji;
    }
  }
  
  return "📚"; // Default fallback
}

// Reset used hues (for testing or new sessions)
export function resetUsedHues() {
  usedHues.clear();
}
