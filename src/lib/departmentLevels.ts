const BASE_LEVELS = [100, 200, 300, 400] as const;
const FIVE_HUNDRED_LEVEL = 500 as const;

const FIVE_LEVEL_DEPARTMENT_KEYS = new Set([
  "civil engineering",
  "telecom engineering",
  "ice",
  "aerospace engineering",
  "mechanical engineering",
  "automotive engineering",
  "mechatronics engineering",
  "met and mat engineering",
  "met mat engineering",
  "eee",
]);

function normalizeDepartmentValue(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function departmentHas500Level(departmentNameOrSlug?: string | null) {
  const normalized = normalizeDepartmentValue(departmentNameOrSlug);
  if (!normalized) return false;

  if (FIVE_LEVEL_DEPARTMENT_KEYS.has(normalized)) return true;

  return (
    normalized.includes("civil engineering") ||
    normalized.includes("telecom engineering") ||
    normalized === "ice" ||
    normalized.includes("aerospace engineering") ||
    normalized.includes("mechanical engineering") ||
    normalized.includes("automotive engineering") ||
    normalized.includes("mechatronics engineering") ||
    normalized.includes("met and mat engineering") ||
    normalized.includes("met mat engineering") ||
    normalized === "eee"
  );
}

export function getDepartmentLevels(departmentNameOrSlug?: string | null) {
  return departmentHas500Level(departmentNameOrSlug)
    ? [...BASE_LEVELS, FIVE_HUNDRED_LEVEL]
    : [...BASE_LEVELS];
}

export function getLevelLabel(level: number) {
  return `${level} Level`;
}
