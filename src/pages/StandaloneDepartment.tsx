import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BookOpen, ChevronRight, FileText, Library, Loader2, Search, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { motion } from "framer-motion";
import { useDepartmentBySlug } from "@/hooks/useDepartmentBySlug";
import { supabase } from "@/integrations/supabase/client";

const SECTIONS = [
  {
    key: "books",
    title: "Books",
    description: "Browse books uploaded for this department.",
    icon: BookOpen,
    gradient: "from-emerald-500/20 to-teal-500/10",
  },
  {
    key: "journals",
    title: "Journals",
    description: "Browse journals uploaded for this department.",
    icon: Library,
    gradient: "from-violet-500/20 to-fuchsia-500/10",
  },
] as const;

type SearchHit = {
  id: string;
  title: string;
  category: "book" | "journal";
  created_at: string;
};

export default function StandaloneDepartment() {
  const navigate = useNavigate();
  const { deptSlug } = useParams<{ deptSlug: string }>();
  const { data: currentDept, isLoading } = useDepartmentBySlug(deptSlug);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!currentDept?.id || q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const handle = setTimeout(async () => {
      const sanitized = q.replace(/[%_\\]/g, "\\$&");
      const { data, error } = await supabase
        .from("standalone_documents" as any)
        .select("id, title, category, created_at")
        .eq("department_id", currentDept.id)
        .ilike("title", `%${sanitized}%`)
        .order("created_at", { ascending: false })
        .limit(25);
      if (cancelled) return;
      if (error) {
        setResults([]);
      } else {
        setResults((data || []) as unknown as SearchHit[]);
      }
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, currentDept?.id]);

  const showResults = query.trim().length >= 2;
  const grouped = useMemo(() => {
    return {
      book: results.filter((r) => r.category === "book"),
      journal: results.filter((r) => r.category === "journal"),
    };
  }, [results]);

  if (!isLoading && !currentDept) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-4">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">Department not found</p>
          <Button onClick={() => navigate("/afit-pdfs")} variant="outline" size="sm">
            Back to Browse
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/afit-pdfs")} className="rounded-full h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold truncate max-w-[220px] md:max-w-none">
                {currentDept?.name || "Loading…"}
              </h1>
              <p className="text-xs text-muted-foreground">Select a document library</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books and journals in this department…"
            className="pl-9 pr-9 h-11"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {showResults ? (
          <div className="rounded-2xl border border-border/40 bg-card shadow-sm">
            {searching ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Searching…</span>
              </div>
            ) : results.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">No matches found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No books or journals in this department match “{query}”.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {(["book", "journal"] as const).map((cat) =>
                  grouped[cat].length === 0 ? null : (
                    <div key={cat} className="p-3">
                      <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {cat === "book" ? "Books" : "Journals"} · {grouped[cat].length}
                      </p>
                      <ul className="space-y-1">
                        {grouped[cat].map((hit) => (
                          <li key={hit.id}>
                            <button
                              onClick={() =>
                                deptSlug &&
                                navigate(`/afit-pdfs/dept/${deptSlug}/${cat === "book" ? "books" : "journals"}`)
                              }
                              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                            >
                              {cat === "book" ? (
                                <BookOpen className="h-4 w-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Library className="h-4 w-4 text-violet-500 shrink-0" />
                              )}
                              <span className="flex-1 truncate text-sm">{hit.title}</span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {SECTIONS.map((section, index) => {
              const Icon = section.icon;
              return (
                <motion.button
                  key={section.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  onClick={() => deptSlug && navigate(`/afit-pdfs/dept/${deptSlug}/${section.key}`)}
                  className={`group min-h-[190px] rounded-3xl border border-border/40 bg-gradient-to-br ${section.gradient} p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg`}
                >
                  <div className="flex h-full flex-col justify-between gap-6">
                    <div className="flex items-center justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/80 shadow-sm">
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground">{section.title}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </main>

      <SmartBottomNav />
    </div>
  );
}
