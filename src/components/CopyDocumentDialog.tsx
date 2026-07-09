import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, XCircle, CircleSlash, Copy } from "lucide-react";
import { toast } from "sonner";
import { useFaculties } from "@/hooks/useFaculties";
import { useDepartments } from "@/hooks/useDepartments";
import { useLectureNotes } from "@/hooks/useLectureNotes";
import { getDepartmentLevels } from "@/lib/departmentLevels";

interface CopyResult {
  department_id: string;
  status: "copied" | "skipped" | "failed";
  reason?: string;
  note_id?: string;
  course_id?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sourceNoteId: string;
  sourceCourseId: string;
  sourceDepartmentId: string;
  sourceTitle: string;
  sourceCourseCode: string;
  sourceCourseName: string;
  sourceLevel: number;
  sourceSemester: "first" | "second";
}

export function CopyDocumentDialog({
  open, onOpenChange,
  sourceNoteId, sourceCourseId, sourceDepartmentId,
  sourceTitle, sourceCourseCode, sourceCourseName, sourceLevel, sourceSemester,
}: Props) {
  const { faculties } = useFaculties();
  const { departments } = useDepartments();
  const { copyNote } = useLectureNotes(sourceCourseId);

  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [level, setLevel] = useState<number>(sourceLevel);
  const [semester, setSemester] = useState<"first" | "second">(sourceSemester);
  const [courseCode, setCourseCode] = useState(sourceCourseCode);
  const [courseName, setCourseName] = useState(sourceCourseName);
  const [titleOverride, setTitleOverride] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CopyResult[]>([]);

  useEffect(() => {
    if (open) {
      setSelectedDeptIds([]);
      setLevel(sourceLevel);
      setSemester(sourceSemester);
      setCourseCode(sourceCourseCode);
      setCourseName(sourceCourseName);
      setTitleOverride("");
      setResults([]);
    }
  }, [open, sourceLevel, sourceSemester, sourceCourseCode, sourceCourseName]);

  const grouped = useMemo(() => {
    return faculties.map((f) => ({
      faculty: f,
      depts: departments.filter(
        (d) => d.faculty_id === f.id && d.id !== sourceDepartmentId,
      ),
    })).filter((g) => g.depts.length > 0);
  }, [faculties, departments, sourceDepartmentId]);

  const toggle = (id: string) => {
    setSelectedDeptIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? id;
  const failedIds = results.filter((r) => r.status === "failed").map((r) => r.department_id);

  const run = async (deptIds: string[]) => {
    if (deptIds.length === 0) return;
    if (!courseCode.trim() || !courseName.trim()) {
      toast.error("Course code and name are required");
      return;
    }
    setRunning(true);
    try {
      const res = await copyNote(
        sourceNoteId,
        deptIds,
        {
          level,
          semester,
          courseCode: courseCode.trim().toUpperCase(),
          courseName: courseName.trim(),
        },
        titleOverride.trim() || undefined,
      );
      // Merge with any previous results (retry updates in place).
      setResults((prev) => {
        const map = new Map(prev.map((r) => [r.department_id, r]));
        for (const r of res) map.set(r.department_id, r);
        return Array.from(map.values());
      });
      const copied = res.filter((r) => r.status === "copied").length;
      const skipped = res.filter((r) => r.status === "skipped").length;
      const failed = res.filter((r) => r.status === "failed").length;
      if (copied > 0) toast.success(`${copied} destination${copied === 1 ? "" : "s"} copied`);
      if (skipped === deptIds.length && copied === 0 && failed === 0) {
        toast.info("Already exists in every destination");
      }
      if (failed > 0) toast.error(`${failed} failed — retry available`);
    } catch (err: any) {
      toast.error(err?.message || "Copy failed");
    } finally {
      setRunning(false);
    }
  };

  const statusChip = (r: CopyResult) => {
    if (r.status === "copied") {
      return <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"><CheckCircle2 className="h-3 w-3" /> copied</Badge>;
    }
    if (r.status === "skipped") {
      return <Badge variant="outline" className="gap-1"><CircleSlash className="h-3 w-3" /> already exists</Badge>;
    }
    return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> {r.reason ?? "failed"}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !running && onOpenChange(v)}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4" /> Copy to another department
          </DialogTitle>
          <DialogDescription>
            Reuse this file across departments — no re-upload. The original uploader stays credited.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/40 border text-xs">
            <p className="font-medium truncate">{sourceTitle}</p>
            <p className="text-muted-foreground">{sourceCourseCode} — {sourceCourseName}</p>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Destination departments</Label>
            <ScrollArea className="h-52 rounded-lg border p-2">
              {grouped.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">No other departments available.</p>
              )}
              {grouped.map(({ faculty, depts }) => (
                <div key={faculty.id} className="mb-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 mb-1">{faculty.name}</p>
                  <div className="space-y-1">
                    {depts.map((d) => (
                      <label key={d.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                        <Checkbox
                          checked={selectedDeptIds.includes(d.id)}
                          onCheckedChange={() => toggle(d.id)}
                          disabled={running}
                        />
                        <span className="flex-1 truncate">{d.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Level</Label>
              <Select value={String(level)} onValueChange={(v) => setLevel(Number(v))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getDepartmentLevels("").map((l) => (
                    <SelectItem key={l} value={String(l)}>{l} Level</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Semester</Label>
              <Select value={semester} onValueChange={(v) => setSemester(v as any)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">First</SelectItem>
                  <SelectItem value="second">Second</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Course code</Label>
              <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="CSC 301" className="h-9 uppercase" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Course name</Label>
              <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="Course name" className="h-9" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Title override (optional)</Label>
            <Input value={titleOverride} onChange={(e) => setTitleOverride(e.target.value)} placeholder={sourceTitle} className="h-9" />
          </div>

          {results.length > 0 && (
            <div className="space-y-1.5 border-t pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Results</p>
              {results.map((r) => (
                <div key={r.department_id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{deptName(r.department_id)}</span>
                  {statusChip(r)}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          {failedIds.length > 0 && (
            <Button
              variant="outline"
              onClick={() => run(failedIds)}
              disabled={running}
              className="gap-1.5"
            >
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Retry failed ({failedIds.length})
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>
            Close
          </Button>
          <Button
            onClick={() => run(selectedDeptIds)}
            disabled={running || selectedDeptIds.length === 0}
            className="gap-1.5"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            Copy to {selectedDeptIds.length || 0} destination{selectedDeptIds.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
