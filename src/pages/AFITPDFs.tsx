import { useNavigate } from "react-router-dom";
import { useDepartments } from "@/hooks/useDepartments";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, GraduationCap, Shield, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { useSession } from "@/hooks/useSession";
import { motion } from "framer-motion";

const departmentIcons: Record<string, typeof BookOpen> = {
  "computer-science": GraduationCap,
  "cyber-security": Shield,
};

const departmentColors: Record<string, string> = {
  "computer-science": "bg-blue-500/5 hover:bg-blue-500/8",
  "cyber-security": "bg-emerald-500/5 hover:bg-emerald-500/8",
};

const departmentAccents: Record<string, string> = {
  "computer-science": "bg-blue-500/8 text-blue-600 dark:text-blue-400",
  "cyber-security": "bg-emerald-500/8 text-emerald-600 dark:text-emerald-400",
};

function AFITPDFsContent() {
  const navigate = useNavigate();
  const { departments, loading } = useDepartments();
  const { session, user } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading departments...</p>
        </motion.div>
      </div>
    );
  }

  const level100Departments = departments.filter(dept => 
    dept.slug === "computer-science" || dept.slug === "cyber-security"
  );

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Header */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="rounded-full h-9 w-9"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">AFIT PDFs</h1>
              <p className="text-xs text-muted-foreground">100 Level Resources</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Hero Section */}
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
            Select Your Department
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Access lecture notes uploaded by course representatives
          </p>
        </motion.div>

        {/* Department Cards */}
        <div className="grid gap-3 max-w-xl mx-auto">
          {level100Departments.map((dept, index) => {
            const Icon = departmentIcons[dept.slug] || BookOpen;
            const colorClass = departmentColors[dept.slug] || "bg-primary/5 hover:bg-primary/10 border-primary/20";
            const accentClass = departmentAccents[dept.slug] || "bg-primary/10 text-primary";
            
            return (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
              >
                <button
                  onClick={() => navigate(`/afit-pdfs/${dept.slug}`)}
                  className={`w-full text-left p-5 rounded-xl ${colorClass} transition-all duration-200 group`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg ${accentClass} flex items-center justify-center shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium mb-0.5">
                        {dept.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        100 Level Courses
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        {level100Departments.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No departments available</p>
          </motion.div>
        )}
      </main>

      <SmartBottomNav />
    </div>
  );
}

export default function AFITPDFs() {
  return (
    <AuthGate>
      <AFITPDFsContent />
    </AuthGate>
  );
}
