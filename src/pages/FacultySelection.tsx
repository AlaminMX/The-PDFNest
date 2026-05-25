import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFaculties } from "@/hooks/useFaculties";
import { useMonthlyLeaderboard } from "@/hooks/useContributorStats";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  BookOpen,
  ShoppingBag,
  ChevronRight,
  Building,
  ClipboardList,
  Search,
  Plus,
  FileText,
  TrendingUp,
  Trophy,
  Clock,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { RamadanDecoration } from "@/components/RamadanDecoration";
import { getDepartmentStyles } from "@/lib/departmentColors";
import { motion } from "framer-motion";
import { GlobalSearch } from "@/components/GlobalSearch";
import afitLogo from "@/assets/afit-logo.png";

interface RecentNote {
  id: string;
  title: string;
  created_at: string | null;
  views: number | null;
  course_code?: string;
  faculty_slug?: string | null;
  department_slug?: string;
  level?: number;
  semester?: string;
}

function FacultySelectionContent() {
  const navigate = useNavigate();
  const { faculties, loading: facLoading } = useFaculties();
  const visibleFaculties = faculties.filter((f) => f.is_visible);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);
  const [trendingNotes, setTrendingNotes] = useState<RecentNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const { entries: topContributors, loading: contribLoading } = useMonthlyLeaderboard();

  useEffect(() => {
    const fetchNotes = async () => {
      setNotesLoading(true);
      try {
        const baseSel = `
          id, title, created_at, views,
          courses ( code, semester, level,
            departments ( slug, faculties ( slug ) )
          )
        `;
        const [recentRes, trendRes] = await Promise.all([
          (supabase as any).from("lecture_notes").select(baseSel).order("created_at", { ascending: false }).limit(6),
          (supabase as any).from("lecture_notes").select(baseSel).order("views", { ascending: false, nullsFirst: false }).limit(6),
        ]);
        const norm = (rows: any[]): RecentNote[] =>
          (rows || []).map((r) => ({
            id: r.id,
            title: r.title,
            created_at: r.created_at,
            views: r.views,
            course_code: r.courses?.code,
            level: r.courses?.level,
            semester: r.courses?.semester,
            department_slug: r.courses?.departments?.slug,
            faculty_slug: r.courses?.departments?.faculties?.slug ?? null,
          }));
        setRecentNotes(norm(recentRes.data || []));
        setTrendingNotes(norm(trendRes.data || []));
      } catch {
        setRecentNotes([]);
        setTrendingNotes([]);
      } finally {
        setNotesLoading(false);
      }
    };
    fetchNotes();
  }, []);

  const goToNote = (n: RecentNote) => {
    if (!n.faculty_slug || !n.department_slug || !n.course_code || !n.level || !n.semester) return;
    navigate(`/afit-pdfs/${n.faculty_slug}/${n.department_slug}/level/${n.level}/semester/${n.semester}/${n.course_code}`);
  };

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-8">
      <RamadanDecoration />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="rounded-full h-9 w-9"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">AFIT PDFs</h1>
              <p className="text-xs text-muted-foreground">Digital Library</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-10">
        {/* HERO */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 via-background to-blue-500/5 px-5 py-8 md:py-12 text-center"
        >
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(circle_at_top,white_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="relative">
            <motion.img
              src={afitLogo}
              alt="Air Force Institute of Technology"
              className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 drop-shadow-[0_4px_20px_hsl(var(--primary)/0.25)]"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            />
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium tracking-wider uppercase mb-3">
              <Sparkles className="w-3 h-3" />
              Quest for Excellence
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
              AFIT Digital Library
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Shared academic materials from course reps across every faculty, department, and level.
            </p>
          </div>
        </motion.section>

        {/* SEARCH BAR */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border/40 bg-muted/30 hover:bg-muted/50 hover:border-primary/40 transition-all duration-200 text-left group"
        >
          <Search className="w-4.5 h-4.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          <span className="text-sm text-muted-foreground flex-1 truncate">
            Search courses, PDFs, departments...
          </span>
          <kbd className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/40 bg-background/60 text-[10px] text-muted-foreground font-mono">
            ⌘K
          </kbd>
        </motion.button>

        {/* DEPARTMENT CATEGORIES */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Building className="w-4 h-4 text-primary" />
                Faculties
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Browse by department</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {facLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-5 rounded-xl bg-muted/30 border border-border/30 aspect-[4/3] animate-pulse" />
                ))
              : visibleFaculties.map((faculty, index) => {
                  const styles = getDepartmentStyles(faculty.color, index);
                  return (
                    <FacultyCard
                      key={faculty.id}
                      faculty={faculty}
                      styles={styles}
                      index={index}
                      onClick={() => navigate(`/afit-pdfs/${faculty.slug}`)}
                    />
                  );
                })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <button
              onClick={() => navigate("/past-questions")}
              className="text-left px-4 py-3.5 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 hover:from-violet-500/15 hover:to-fuchsia-500/15 border border-violet-500/20 transition-all duration-200 group flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">Past Questions</h4>
                <p className="text-xs text-muted-foreground">Browse past exams</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            <button
              onClick={() => navigate("/school-store")}
              className="text-left px-4 py-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/15 hover:to-orange-500/15 border border-amber-500/20 transition-all duration-200 group flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">School Store</h4>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </section>

        {/* RECENT PDFS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Recent PDFs
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Freshly uploaded by reps</p>
            </div>
          </div>
          <NotesList notes={recentNotes} loading={notesLoading} onClick={goToNote} emptyHint="No materials uploaded yet" />
        </section>

        {/* TOP CONTRIBUTORS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Top Contributors
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">This month's leaders</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")} className="text-xs h-8 gap-1">
              View all
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {contribLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : topContributors.length === 0 ? (
            <div className="text-center py-8 rounded-xl bg-muted/20 border border-border/30">
              <p className="text-sm text-muted-foreground">No contributions yet this month</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topContributors.slice(0, 5).map((entry, i) => (
                <motion.button
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/user/${entry.user_id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/30 transition-all text-left group"
                >
                  <span className="w-6 text-center text-sm font-bold text-muted-foreground shrink-0">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {(entry.display_name || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.display_name || "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.department_name || "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-primary">{entry.monthly_uploads}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">uploads</p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </section>

        {/* TRENDING MATERIALS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Trending Materials
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Most viewed PDFs</p>
            </div>
          </div>
          <NotesList notes={trendingNotes} loading={notesLoading} onClick={goToNote} showViews emptyHint="Nothing trending yet" />
        </section>

        {!facLoading && visibleFaculties.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No faculties available yet</p>
          </div>
        )}
      </main>

      {/* CONTRIBUTE FAB */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => navigate("/contribute")}
        className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 inline-flex items-center gap-2 pl-4 pr-5 py-3.5 rounded-full bg-primary text-primary-foreground shadow-[0_8px_28px_-6px_hsl(var(--primary)/0.5)] hover:shadow-[0_10px_32px_-6px_hsl(var(--primary)/0.6)] transition-shadow font-medium text-sm"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Contribute PDF"
      >
        <Plus className="w-4 h-4" />
        Contribute PDF
      </motion.button>

      <SmartBottomNav />
    </div>
  );
}

function NotesList({
  notes,
  loading,
  onClick,
  showViews,
  emptyHint,
}: {
  notes: RecentNote[];
  loading: boolean;
  onClick: (n: RecentNote) => void;
  showViews?: boolean;
  emptyHint: string;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }
  if (notes.length === 0) {
    return (
      <div className="text-center py-8 rounded-xl bg-muted/20 border border-border/30">
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {notes.map((n, i) => (
        <motion.button
          key={n.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          onClick={() => onClick(n)}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/30 transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{n.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {n.course_code || "—"}
              {n.level ? ` · ${n.level}L` : ""}
            </p>
          </div>
          {showViews && (
            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
              {n.views ?? 0} views
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </motion.button>
      ))}
    </div>
  );
}

function FacultyCard({ faculty, styles, index, onClick }: { faculty: any; styles: any; index: number; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
    >
      <button
        onClick={onClick}
        className="w-full text-left p-5 rounded-xl border border-border/20 hover:border-border/40 transition-all duration-200 group aspect-[4/3] flex flex-col justify-between relative overflow-hidden"
        style={{ background: styles.bgLight }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
          style={{ background: styles.accentBg }}
        />
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 text-2xl"
          style={{
            background: styles.accentBg,
            boxShadow: `0 4px 16px ${styles.glowColor}`,
          }}
        >
          {faculty.icon || <Building className="w-6 h-6 text-white" />}
        </div>
        <div>
          <h3 className="font-semibold mb-0.5 text-sm leading-tight" style={{ color: styles.textColor }}>
            {faculty.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {faculty.department_count} {faculty.department_count === 1 ? "dept" : "depts"}
          </p>
        </div>
        <ChevronRight className="absolute bottom-4 right-4 w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
      </button>
    </motion.div>
  );
}

export default function FacultySelection() {
  return <FacultySelectionContent />;
}
