import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getDepartmentLevels } from "@/lib/departmentLevels";
import { getRepLevelLabel } from "@/lib/repLevelLabels";
import { useDepartments } from "@/hooks/useDepartments";

type Mode = "rep" | "admin";

interface CreateCourseModalProps {
  open: boolean;
  onClose: () => void;
  mode: Mode;
  /** Required when mode === "rep". When mode === "admin", optional initial dept. */
  departmentId?: string | null;
  departmentName?: string | null;
  /** Pre-select level/semester (e.g. when triggered from RepUpload). */
  initialLevel?: number;
  initialSemester?: "first" | "second";
  /** Called after a successful create — receives the new course id. */
  onCreated?: (courseId: string) => void;
}

interface ExistingCourse {
  id: string;
  code: string;
  name: string;
  level: number;
  semester: string;
  department_id: string;
}

const SEMESTER_OPTIONS = [
  { value: "first", label: "First Semester" },
  { value: "second", label: "Second Semester" },
];

const DEFAULT_CREDIT_UNITS = 3;

function normalizeCode(value: string): string {
  // Uppercase, collapse whitespace, allow letters/numbers/space/hyphen
  return value.toUpperCase().replace(/\s+/g, " ").trim();
}

export function CreateCourseModal({
  open,
  onClose,
  mode,
  departmentId,
  departmentName,
  initialLevel,
  initialSemester,
  onCreated,
}: CreateCourseModalProps) {
  const isRep = mode === "rep";
  const { departments, loading: deptsLoading } = useDepartments();

  // Selected department (admin can change; rep is locked to their own)
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(
    departmentId ?? null,
  );

  // Available levels depend on department name (engineering depts get 500L)
  const selectedDept = useMemo(
    () => departments.find((d) => d.id === selectedDeptId) ?? null,
    [departments, selectedDeptId],
  );
  const effectiveDeptName = selectedDept?.name ?? departmentName ?? null;
  const availableLevels = useMemo(
    () => getDepartmentLevels(effectiveDeptName),
    [effectiveDeptName],
  );

  // Form state
  const [level, setLevel] = useState<number>(initialLevel ?? 100);
  const [semester, setSemester] = useState<"first" | "second">(
    initialSemester ?? "first",
  );
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [creditUnits, setCreditUnits] = useState<string>(
    String(DEFAULT_CREDIT_UNITS),
  );
  const [saving, setSaving] = useState(false);

  // Existing courses in this dept (used for autocomplete + duplicate check)
  const [existing, setExisting] = useState<ExistingCourse[]>([]);
  const [existingLoading, setExistingLoading] = useState(false);

  // Recently created (this session) — surfaced as quick suggestions
  const [recentlyCreated, setRecentlyCreated] = useState<ExistingCourse[]>([]);

  // Autocomplete suggestions (matches against code or name)
  const [showSuggestions, setShowSuggestions] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Reset / sync when opening
  useEffect(() => {
    if (!open) return;
    setSelectedDeptId(departmentId ?? null);
    setLevel(initialLevel ?? 100);
    setSemester(initialSemester ?? "first");
    setCode("");
    setName("");
    setCreditUnits(String(DEFAULT_CREDIT_UNITS));
    setRecentlyCreated([]);
    // focus code field shortly after open
    setTimeout(() => codeInputRef.current?.focus(), 80);
  }, [open, departmentId, initialLevel, initialSemester]);

  // Load existing courses for the active department (for autocomplete + dup check)
  useEffect(() => {
    if (!open || !selectedDeptId) {
      setExisting([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setExistingLoading(true);
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, name, level, semester, department_id")
        .eq("department_id", selectedDeptId);
      if (!cancelled) {
        if (error) {
          console.error("Failed to load existing courses:", error);
          setExisting([]);
        } else {
          setExisting((data ?? []) as ExistingCourse[]);
        }
        setExistingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selectedDeptId]);

  // Compute autocomplete matches
  const normalizedCode = normalizeCode(code);
  const matches = useMemo(() => {
    if (!normalizedCode || normalizedCode.length < 2) return [];
    const needleCode = normalizedCode.replace(/\s+/g, "");
    const needleName = name.trim().toLowerCase();
    return existing
      .filter((c) => {
        const codeMatch = c.code
          .toUpperCase()
          .replace(/\s+/g, "")
          .includes(needleCode);
        const nameMatch =
          needleName.length >= 3 && c.name.toLowerCase().includes(needleName);
        return codeMatch || nameMatch;
      })
      .slice(0, 5);
  }, [existing, normalizedCode, name]);

  // Exact duplicate (same code + level + semester within department)
  const duplicate = useMemo(() => {
    if (!normalizedCode) return null;
    const stripped = normalizedCode.replace(/\s+/g, "");
    return (
      existing.find(
        (c) =>
          c.code.toUpperCase().replace(/\s+/g, "") === stripped &&
          c.level === level &&
          c.semester === semester,
      ) ?? null
    );
  }, [existing, normalizedCode, level, semester]);

  const canSubmit =
    !!selectedDeptId &&
    !!normalizedCode &&
    !!name.trim() &&
    (availableLevels as readonly number[]).includes(level) &&
    !duplicate &&
    !saving;

  const levelLabel = (lvl: number) => (isRep ? getRepLevelLabel(lvl) : `${lvl} Level`);

  const handleApplySuggestion = (c: ExistingCourse) => {
    setCode(c.code);
    setName(c.name);
    setLevel(c.level);
    setSemester(c.semester as "first" | "second");
    setShowSuggestions(false);
  };

  const submitCourse = async (keepOpen: boolean) => {
    if (!canSubmit || !selectedDeptId) return;
    setSaving(true);
    try {
      const payload = {
        department_id: selectedDeptId,
        code: normalizedCode,
        name: name.trim(),
        level,
        semester,
        credit_units: Math.max(0, parseInt(creditUnits) || DEFAULT_CREDIT_UNITS),
        status: "approved" as const,
      };

      const { data, error } = await supabase
        .from("courses")
        .insert(payload as any)
        .select("id, code, name, level, semester, department_id")
        .single();

      if (error) throw error;

      toast.success(`Added ${payload.code} (${levelLabel(level)})`, {
        description: payload.name,
      });

      if (data) {
        const created = data as ExistingCourse;
        setExisting((prev) => [...prev, created]);
        setRecentlyCreated((prev) => [created, ...prev].slice(0, 5));
        onCreated?.(created.id);
      }

      // Reset code/name only — keep level/semester for fast repeat entry
      setCode("");
      setName("");
      setCreditUnits(String(DEFAULT_CREDIT_UNITS));

      if (!keepOpen) {
        onClose();
      } else {
        setTimeout(() => codeInputRef.current?.focus(), 50);
      }
    } catch (err: any) {
      console.error("Course create failed:", err);
      toast.error(err?.message || "Failed to create course");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && canSubmit) {
      e.preventDefault();
      submitCourse(true);
    }
  };

  // For rep mode the dept is locked. For admin, allow choosing any.
  const renderDeptField = () => {
    if (isRep) {
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Department</Label>
          <div className="px-3 py-2 rounded-md border bg-muted/40 text-sm font-medium">
            {effectiveDeptName ?? "—"}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-1.5">
        <Label htmlFor="cc-dept" className="text-xs">Department</Label>
        <Select
          value={selectedDeptId ?? ""}
          onValueChange={(v) => setSelectedDeptId(v)}
          disabled={deptsLoading || saving}
        >
          <SelectTrigger id="cc-dept" className="h-9">
            <SelectValue placeholder="Choose department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Create Course
          </DialogTitle>
          <DialogDescription>
            {isRep
              ? "Quickly add a course to your department. Pick level and semester, then enter the course."
              : "Quickly add a course to any department, level, and semester."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {renderDeptField()}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cc-level" className="text-xs">Level</Label>
              <Select
                value={String(level)}
                onValueChange={(v) => setLevel(Number(v))}
                disabled={saving || !selectedDeptId}
              >
                <SelectTrigger id="cc-level" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableLevels.map((l) => (
                    <SelectItem key={l} value={String(l)}>
                      {levelLabel(l)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-sem" className="text-xs">Semester</Label>
              <Select
                value={semester}
                onValueChange={(v) => setSemester(v as "first" | "second")}
                disabled={saving}
              >
                <SelectTrigger id="cc-sem" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEMESTER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1 relative">
              <Label htmlFor="cc-code" className="text-xs">Course Code</Label>
              <Input
                id="cc-code"
                ref={codeInputRef}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={handleKeyDown}
                placeholder="CSC 301"
                className="h-9 uppercase"
                autoComplete="off"
                disabled={saving || !selectedDeptId}
              />
              {showSuggestions && matches.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 border rounded-md bg-popover shadow-md overflow-hidden">
                  {matches.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleApplySuggestion(m);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="font-medium truncate">{m.code}</span>
                      <span className="text-muted-foreground truncate">
                        {m.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="cc-name" className="text-xs">Course Name</Label>
              <Input
                id="cc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Introduction to Programming"
                className="h-9"
                disabled={saving || !selectedDeptId}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cc-cu" className="text-xs">Credit Units</Label>
              <Input
                id="cc-cu"
                type="number"
                min={0}
                max={20}
                value={creditUnits}
                onChange={(e) => setCreditUnits(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-9"
                disabled={saving}
              />
            </div>
          </div>

          {existingLoading && (
            <p className="text-[11px] text-muted-foreground">
              <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
              Checking for duplicates…
            </p>
          )}

          {duplicate && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs flex items-center justify-between gap-2">
                <span>
                  <strong>{duplicate.code}</strong> already exists in{" "}
                  {levelLabel(duplicate.level)} ({duplicate.semester} semester).
                </span>
                <Link
                  to={
                    isRep
                      ? "/rep-upload"
                      : `/admin/departments/${duplicate.department_id}/levels`
                  }
                  className="inline-flex items-center gap-1 underline shrink-0"
                  onClick={onClose}
                >
                  View <ExternalLink className="w-3 h-3" />
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {recentlyCreated.length > 0 && (
            <div className="space-y-1.5 rounded-md border border-dashed border-border/60 p-2 bg-muted/20">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 inline text-green-600 mr-1" />
                Just created
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recentlyCreated.map((c) => (
                  <Badge
                    key={c.id}
                    variant="secondary"
                    className="text-[10px] font-medium"
                  >
                    {c.code} · {levelLabel(c.level)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="sm:mr-auto"
          >
            Done
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => submitCourse(true)}
            disabled={!canSubmit}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Save & add another
          </Button>
          <Button
            type="button"
            onClick={() => submitCourse(false)}
            disabled={!canSubmit}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Create course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
