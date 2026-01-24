import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDepartmentTimetable, type TimetableCourse, type TimetableSlot } from "@/hooks/useDepartmentTimetable";
import { useAuth } from "@/hooks/useAuth";

type RowId = string;

type TimetableRow = {
  rowId: RowId;
  courseId: string;
  slotId: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  courseName: string;
  courseCode: string;
  creditUnits: number;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function formatTimeRange(dayOfWeek: string, startTime: string, endTime: string) {
  if (!dayOfWeek && !startTime && !endTime) return "";
  const start = startTime || "";
  const end = endTime || "";
  return [dayOfWeek, start && end ? `${start}–${end}` : start || end].filter(Boolean).join(" ");
}

function buildRows(courses: TimetableCourse[], slots: TimetableSlot[]): TimetableRow[] {
  const slotsByCourse = new Map<string, TimetableSlot[]>();
  for (const slot of slots) {
    const arr = slotsByCourse.get(slot.course_id) || [];
    arr.push(slot);
    slotsByCourse.set(slot.course_id, arr);
  }

  const rows: TimetableRow[] = [];

  for (const course of courses) {
    const courseSlots = slotsByCourse.get(course.id) || [];

    if (courseSlots.length === 0) {
      rows.push({
        rowId: `course:${course.id}:empty`,
        courseId: course.id,
        slotId: null,
        dayOfWeek: "",
        startTime: "",
        endTime: "",
        courseName: course.name,
        courseCode: course.code,
        creditUnits: course.credit_units ?? 0,
      });
      continue;
    }

    for (const slot of courseSlots) {
      rows.push({
        rowId: `slot:${slot.id}`,
        courseId: course.id,
        slotId: slot.id,
        dayOfWeek: slot.day_of_week,
        startTime: slot.start_time,
        endTime: slot.end_time,
        courseName: course.name,
        courseCode: course.code,
        creditUnits: course.credit_units ?? 0,
      });
    }
  }

  return rows;
}

export function DepartmentTimetable({
  departmentId,
  canEdit,
}: {
  departmentId: string;
  canEdit: boolean;
}) {
  const { user } = useAuth();
  const [level, setLevel] = useState<number>(100);
  const { data, isLoading, isFetching, refetch } = useDepartmentTimetable(departmentId, level);

  const courses = data?.courses ?? [];
  const slots = data?.slots ?? [];

  const availableLevels = useMemo(() => {
    // Small convenience: common levels
    return [100, 200, 300, 400, 500];
  }, []);

  const computedRows = useMemo(() => buildRows(courses, slots), [courses, slots]);
  const [rows, setRows] = useState<TimetableRow[]>(computedRows);
  const [initialRows, setInitialRows] = useState<TimetableRow[]>(computedRows);
  const [dirty, setDirty] = useState(false);

  const [addSlotCourseId, setAddSlotCourseId] = useState<string>("");

  useEffect(() => {
    // When new data arrives, reset drafts only if user hasn't started editing.
    if (!dirty) {
      setRows(computedRows);
      setInitialRows(computedRows);
    }
  }, [computedRows, dirty]);

  const courseById = useMemo(() => {
    const m = new Map<string, TimetableCourse>();
    for (const c of courses) m.set(c.id, c);
    return m;
  }, [courses]);

  const updateRow = (rowId: RowId, patch: Partial<TimetableRow>) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r));
      return next;
    });
    setDirty(true);
  };

  const handleAddSlot = () => {
    if (!addSlotCourseId) {
      toast.info("Select a course first");
      return;
    }

    const course = courseById.get(addSlotCourseId);
    if (!course) return;

    const newRow: TimetableRow = {
      rowId: `new:${crypto.randomUUID()}`,
      courseId: course.id,
      slotId: null,
      dayOfWeek: "Mon",
      startTime: "08:00",
      endTime: "10:00",
      courseName: course.name,
      courseCode: course.code,
      creditUnits: course.credit_units ?? 0,
    };
    setRows((prev) => [newRow, ...prev]);
    setDirty(true);
  };

  const handleDeleteRow = (rowId: RowId) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
    setDirty(true);
  };

  const handleReset = () => {
    setRows(initialRows);
    setDirty(false);
  };

  const handleSave = async () => {
    if (!canEdit) return;

    try {
      // Compute course updates from the first row we see per course.
      const firstRowPerCourse = new Map<string, TimetableRow>();
      for (const r of rows) {
        if (!firstRowPerCourse.has(r.courseId)) firstRowPerCourse.set(r.courseId, r);
      }

      const initialFirstRowPerCourse = new Map<string, TimetableRow>();
      for (const r of initialRows) {
        if (!initialFirstRowPerCourse.has(r.courseId)) initialFirstRowPerCourse.set(r.courseId, r);
      }

      const courseUpdates: Array<{ id: string; name: string; code: string; credit_units: number }> = [];
      for (const [courseId, r] of firstRowPerCourse.entries()) {
        const init = initialFirstRowPerCourse.get(courseId);
        const changed =
          !init ||
          init.courseName !== r.courseName ||
          init.courseCode !== r.courseCode ||
          init.creditUnits !== r.creditUnits;

        if (changed) {
          courseUpdates.push({
            id: courseId,
            name: r.courseName.trim(),
            code: r.courseCode.trim(),
            credit_units: Number.isFinite(r.creditUnits) ? r.creditUnits : 0,
          });
        }
      }

      // Slot diffs
      const initialBySlotId = new Map<string, TimetableRow>();
      for (const r of initialRows) {
        if (r.slotId) initialBySlotId.set(r.slotId, r);
      }

      const currentSlotIds = new Set(rows.filter((r) => r.slotId).map((r) => r.slotId as string));
      const deletedSlotIds = Array.from(initialBySlotId.keys()).filter((id) => !currentSlotIds.has(id));

      const slotInserts: Array<{ course_id: string; day_of_week: string; start_time: string; end_time: string }> = [];
      const slotUpdates: Array<{ id: string; day_of_week: string; start_time: string; end_time: string }> = [];

      for (const r of rows) {
        const hasAnyTime = !!r.dayOfWeek || !!r.startTime || !!r.endTime;
        if (!hasAnyTime) continue;

        if (!r.dayOfWeek || !r.startTime || !r.endTime) {
          toast.error("Each timetable row needs day, start time and end time");
          return;
        }

        if (r.startTime >= r.endTime) {
          toast.error("Start time must be before end time");
          return;
        }

        if (!r.slotId) {
          slotInserts.push({
            course_id: r.courseId,
            day_of_week: r.dayOfWeek,
            start_time: r.startTime,
            end_time: r.endTime,
          });
          continue;
        }

        const init = initialBySlotId.get(r.slotId);
        const changed =
          !init ||
          init.dayOfWeek !== r.dayOfWeek ||
          init.startTime !== r.startTime ||
          init.endTime !== r.endTime;

        if (changed) {
          slotUpdates.push({
            id: r.slotId,
            day_of_week: r.dayOfWeek,
            start_time: r.startTime,
            end_time: r.endTime,
          });
        }
      }

      // Persist
      if (courseUpdates.length) {
        await Promise.all(
          courseUpdates.map((u) =>
            supabase.from("courses").update({
              name: u.name,
              code: u.code,
              credit_units: u.credit_units,
            }).eq("id", u.id)
          )
        );
      }

      if (slotUpdates.length) {
        await Promise.all(
          slotUpdates.map((u) =>
            supabase.from("course_timetable_slots").update({
              day_of_week: u.day_of_week,
              start_time: u.start_time,
              end_time: u.end_time,
            }).eq("id", u.id)
          )
        );
      }

      if (slotInserts.length) {
        const { error } = await supabase.from("course_timetable_slots").insert(slotInserts);
        if (error) throw error;
      }

      if (deletedSlotIds.length) {
        const { error } = await supabase
          .from("course_timetable_slots")
          .delete()
          .in("id", deletedSlotIds);
        if (error) throw error;
      }

      // Send timetable change notifications (fire and forget)
      const hasChanges = slotInserts.length > 0 || slotUpdates.length > 0 || deletedSlotIds.length > 0;
      if (hasChanges) {
        // Get user's display name for the notification
        let changedBy = "Unknown";
        if (user?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, full_name")
            .eq("id", user.id)
            .single();
          changedBy = profile?.display_name || profile?.full_name || "Unknown";
        }

        // Send notifications for each type of change
        const notificationPromises: Promise<any>[] = [];
        
        // Group by course for more informative notifications
        const affectedCourses = new Map<string, { code: string; name: string }>();
        
        for (const slot of slotInserts) {
          const row = rows.find(r => r.courseId === slot.course_id);
          if (row) affectedCourses.set(slot.course_id, { code: row.courseCode, name: row.courseName });
        }
        for (const slot of slotUpdates) {
          const row = rows.find(r => r.slotId === slot.id);
          if (row) affectedCourses.set(row.courseId, { code: row.courseCode, name: row.courseName });
        }
        for (const slotId of deletedSlotIds) {
          const row = initialRows.find(r => r.slotId === slotId);
          if (row) affectedCourses.set(row.courseId, { code: row.courseCode, name: row.courseName });
        }

        // Send one notification per course with changes
        for (const [courseId, course] of affectedCourses) {
          const courseInserts = slotInserts.filter(s => s.course_id === courseId).length;
          const courseUpdates = slotUpdates.filter(s => {
            const row = rows.find(r => r.slotId === s.id);
            return row?.courseId === courseId;
          }).length;
          const courseDeletes = deletedSlotIds.filter(id => {
            const row = initialRows.find(r => r.slotId === id);
            return row?.courseId === courseId;
          }).length;

          // Determine primary change type
          let changeType: "slot_added" | "slot_updated" | "slot_removed" = "slot_updated";
          let slotsAffected = 1;
          
          if (courseInserts > 0) {
            changeType = "slot_added";
            slotsAffected = courseInserts;
          } else if (courseDeletes > 0) {
            changeType = "slot_removed";
            slotsAffected = courseDeletes;
          } else if (courseUpdates > 0) {
            changeType = "slot_updated";
            slotsAffected = courseUpdates;
          }

          notificationPromises.push(
            supabase.functions.invoke("notify-timetable-change", {
              body: {
                departmentId,
                changeType,
                courseCode: course.code,
                courseName: course.name,
                changedBy,
                slotsAffected,
              },
            }).catch(err => console.error("Failed to send timetable notification:", err))
          );
        }

        // Fire and forget - don't block on notification sending
        Promise.all(notificationPromises).catch(console.error);
      }

      toast.success("Timetable saved");
      setDirty(false);
      await refetch();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save timetable");
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={String(level)} onValueChange={(v) => setLevel(Number(v))}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              {availableLevels.map((lvl) => (
                <SelectItem key={lvl} value={String(lvl)}>
                  {lvl} Level
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canEdit && (
            <div className="flex gap-2">
              <Select value={addSlotCourseId} onValueChange={setAddSlotCourseId}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Add slot for course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddSlot} variant="secondary">
                Add Slot
              </Button>
            </div>
          )}
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <Button onClick={handleReset} variant="outline" disabled={!dirty}>
              Reset
            </Button>
            <Button onClick={handleSave} disabled={!dirty || isFetching}>
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border/30 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Time</TableHead>
              <TableHead>Course Name</TableHead>
              <TableHead className="w-[140px]">Course Code</TableHead>
              <TableHead className="w-[140px]">Credit Units</TableHead>
              {canEdit && <TableHead className="w-[80px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="py-6" colSpan={canEdit ? 5 : 4}>
                    <div className="h-4 w-full bg-muted/50 rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 5 : 4} className="text-sm text-muted-foreground py-10 text-center">
                  No courses found for this level.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.rowId}>
                  <TableCell>
                    {canEdit ? (
                      <div className="flex flex-wrap gap-2">
                        <Select value={r.dayOfWeek || "Mon"} onValueChange={(v) => updateRow(r.rowId, { dayOfWeek: v })}>
                          <SelectTrigger className="w-[90px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS.map((d) => (
                              <SelectItem key={d} value={d}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="time"
                          value={r.startTime}
                          onChange={(e) => updateRow(r.rowId, { startTime: e.target.value })}
                          className="w-[110px]"
                        />
                        <Input
                          type="time"
                          value={r.endTime}
                          onChange={(e) => updateRow(r.rowId, { endTime: e.target.value })}
                          className="w-[110px]"
                        />
                      </div>
                    ) : (
                      <span className="text-sm">
                        {formatTimeRange(r.dayOfWeek, r.startTime, r.endTime) || "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Input value={r.courseName} onChange={(e) => updateRow(r.rowId, { courseName: e.target.value })} />
                    ) : (
                      <span className="text-sm">{r.courseName}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Input value={r.courseCode} onChange={(e) => updateRow(r.rowId, { courseCode: e.target.value })} />
                    ) : (
                      <span className="text-sm font-medium">{r.courseCode}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Input
                        inputMode="numeric"
                        value={String(r.creditUnits)}
                        onChange={(e) => updateRow(r.rowId, { creditUnits: Number(e.target.value || 0) })}
                      />
                    ) : (
                      <span className="text-sm">{r.creditUnits}</span>
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteRow(r.rowId)}>
                        Remove
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
