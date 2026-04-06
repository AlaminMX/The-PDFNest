import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { BookOpen, FileText, ScrollText, Loader2, Search } from "lucide-react";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { query, setQuery, results, loading } = useGlobalSearch();

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) setQuery("");
  }, [open, setQuery]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const hasResults =
    results.courses.length > 0 ||
    results.pqCourses.length > 0 ||
    results.lectureNotes.length > 0 ||
    results.pastQuestions.length > 0;

  const navigateToCourse = (c: {
    code: string;
    faculty_slug: string | null;
    department_slug: string;
    level: number;
    semester: string;
  }) => {
    if (!c.faculty_slug || !c.department_slug) return;
    navigate(
      `/afit-pdfs/${c.faculty_slug}/${c.department_slug}/level/${c.level}/semester/${c.semester}/${c.code}`
    );
    close();
  };

  const navigateToPQCourse = (c: { code: string; level: number; semester: string }) => {
    navigate(`/past-questions/level/${c.level}/semester/${c.semester}/${c.code}`);
    close();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search courses, PDFs, past questions..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[60vh]">
        {loading && query.trim().length >= 2 && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">Searching…</span>
          </div>
        )}

        {!loading && query.trim().length >= 2 && !hasResults && (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-4">
              <Search className="h-8 w-8 text-muted-foreground/50" />
              <p>No results found</p>
              <p className="text-xs text-muted-foreground">
                Try another keyword or upload material
              </p>
            </div>
          </CommandEmpty>
        )}

        {/* Course Matches */}
        {results.courses.length > 0 && (
          <CommandGroup heading="Courses">
            {results.courses.map((c) => (
              <CommandItem
                key={`course-${c.id}`}
                value={`${c.code} ${c.name} ${c.department_name}`}
                onSelect={() => navigateToCourse(c)}
                className="cursor-pointer"
              >
                <BookOpen className="mr-2 h-4 w-4 text-primary shrink-0" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-medium text-sm truncate">
                    {c.code} — {c.name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {c.department_name} · {c.level}L · {c.semester} semester
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* PQ Course Matches */}
        {results.pqCourses.length > 0 && (
          <>
            {results.courses.length > 0 && <CommandSeparator />}
            <CommandGroup heading="Past Question Courses">
              {results.pqCourses.map((c) => (
                <CommandItem
                  key={`pq-course-${c.id}`}
                  value={`PQ ${c.code} ${c.name}`}
                  onSelect={() => navigateToPQCourse(c)}
                  className="cursor-pointer"
                >
                  <ScrollText className="mr-2 h-4 w-4 text-violet-500 shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium text-sm truncate">
                      {c.code} — {c.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {c.level}L · {c.semester} semester
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Lecture Notes */}
        {results.lectureNotes.length > 0 && (
          <>
            {(results.courses.length > 0 || results.pqCourses.length > 0) && (
              <CommandSeparator />
            )}
            <CommandGroup heading="PDFs / Lecture Notes">
              {results.lectureNotes.map((n) => (
                <CommandItem
                  key={`note-${n.id}`}
                  value={`PDF ${n.title} ${n.course_code}`}
                  onSelect={() => {
                    if (n.faculty_slug && n.department_slug) {
                      navigate(
                        `/afit-pdfs/${n.faculty_slug}/${n.department_slug}/level/${n.level}/semester/${n.semester}/${n.course_code}`
                      );
                    }
                    close();
                  }}
                  className="cursor-pointer"
                >
                  <FileText className="mr-2 h-4 w-4 text-blue-500 shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium text-sm truncate">{n.title}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {n.course_code} · {n.level}L
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Past Questions Files */}
        {results.pastQuestions.length > 0 && (
          <>
            {(results.courses.length > 0 ||
              results.pqCourses.length > 0 ||
              results.lectureNotes.length > 0) && <CommandSeparator />}
            <CommandGroup heading="Past Questions">
              {results.pastQuestions.map((p) => (
                <CommandItem
                  key={`pq-${p.id}`}
                  value={`PQF ${p.title} ${p.course_code}`}
                  onSelect={() => {
                    navigate(
                      `/past-questions/level/${p.level}/semester/${p.semester}/${p.course_code}`
                    );
                    close();
                  }}
                  className="cursor-pointer"
                >
                  <ScrollText className="mr-2 h-4 w-4 text-purple-500 shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium text-sm truncate">{p.title}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {p.course_code} · {p.level}L
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Hint when empty */}
        {query.trim().length < 2 && (
          <div className="py-8 text-center text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Type a course code or keyword to search</p>
            <p className="text-xs mt-1 opacity-70">e.g. MTH102, probability, CSC112 cyber</p>
          </div>
        )}
      </CommandList>
    </CommandDialog>
  );
}
