import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, ChevronRight, Library } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { motion } from "framer-motion";
import { useDepartmentBySlug } from "@/hooks/useDepartmentBySlug";

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

export default function StandaloneDepartment() {
  const navigate = useNavigate();
  const { deptSlug } = useParams<{ deptSlug: string }>();
  const { data: currentDept, isLoading } = useDepartmentBySlug(deptSlug);

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
      </main>

      <SmartBottomNav />
    </div>
  );
}
