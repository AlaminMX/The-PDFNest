import { useNavigate } from "react-router-dom";
import { useFaculties } from "@/hooks/useFaculties";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, ShoppingBag, ChevronRight, Building, ClipboardList } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { RamadanDecoration } from "@/components/RamadanDecoration";
import { getDepartmentStyles } from "@/lib/departmentColors";
import { motion } from "framer-motion";

function FacultySelectionContent() {
  const navigate = useNavigate();
  const { faculties, loading } = useFaculties();
  const visibleFaculties = faculties.filter((f) => f.is_visible);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <RamadanDecoration />

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
              <p className="text-xs text-muted-foreground">Academic Resources</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 text-primary text-xs font-medium mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            Academic Resources
          </div>
          <h2 className="text-xl md:text-2xl font-semibold mb-2">
            Select Your Faculty
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Choose a faculty to browse departments and access lecture notes
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          {/* Faculty Grid */}
          <div className="grid grid-cols-2 gap-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-5 rounded-xl bg-muted/30 border border-border/30 aspect-[4/3]">
                    <div className="h-10 w-10 bg-muted/50 rounded-lg mb-3" />
                    <div className="h-4 w-2/3 bg-muted/50 rounded mb-2" />
                    <div className="h-3 w-1/2 bg-muted/50 rounded" />
                  </div>
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

          {/* Past Questions Tile */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: visibleFaculties.length * 0.06 }}
            className="mt-3"
          >
            <button
              onClick={() => navigate("/past-questions")}
              className="w-full text-left px-5 py-4 rounded-xl bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 hover:from-violet-500/15 hover:via-purple-500/15 hover:to-fuchsia-500/15 border border-violet-500/20 transition-all duration-200 group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium">Past Questions</h3>
                <p className="text-xs text-muted-foreground">Browse past exams & tests</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: visibleFaculties.length * 0.06 }}
            className="mt-3"
          >
            <button
              onClick={() => navigate("/school-store")}
              className="w-full text-left px-5 py-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 hover:from-amber-500/15 hover:via-orange-500/15 hover:to-red-500/15 border border-amber-500/20 transition-all duration-200 group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/30">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium">School Store</h3>
                <p className="text-xs text-muted-foreground">Coming Soon • Join the waitlist</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          </motion.div>
        </div>

        {!loading && visibleFaculties.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No faculties available yet</p>
          </motion.div>
        )}
      </main>

      <SmartBottomNav />
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
