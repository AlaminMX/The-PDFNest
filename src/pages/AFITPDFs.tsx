import { useNavigate } from "react-router-dom";
import { useDepartments } from "@/hooks/useDepartments";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, GraduationCap, Shield, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BottomNav } from "@/components/BottomNav";
import { useSession } from "@/hooks/useSession";
import { motion } from "framer-motion";

const departmentIcons: Record<string, typeof BookOpen> = {
  "computer-science": GraduationCap,
  "cyber-security": Shield,
};

const departmentColors: Record<string, string> = {
  "computer-science": "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  "cyber-security": "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
};

const departmentAccents: Record<string, string> = {
  "computer-science": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "cyber-security": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

function AFITPDFsContent() {
  const navigate = useNavigate();
  const { departments, loading } = useDepartments();
  const { session, user } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Loading departments...</p>
        </motion.div>
      </div>
    );
  }

  const level100Departments = departments.filter(dept => 
    dept.slug === "computer-science" || dept.slug === "cyber-security"
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AFIT PDFs</h1>
              <p className="text-xs text-muted-foreground">100 Level Resources</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <BookOpen className="w-4 h-4" />
            Academic Resources
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Select Your Department
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Access lecture notes uploaded by course representatives for your courses
          </p>
        </motion.div>

        {/* Department Cards */}
        <div className="grid gap-4 md:gap-6 max-w-2xl mx-auto">
          {level100Departments.map((dept, index) => {
            const Icon = departmentIcons[dept.slug] || BookOpen;
            const colorClass = departmentColors[dept.slug] || "from-primary/20 to-primary/10 border-primary/30";
            const accentClass = departmentAccents[dept.slug] || "bg-primary/10 text-primary";
            
            return (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <button
                  onClick={() => navigate(`/afit-pdfs/${dept.slug}`)}
                  className={`w-full text-left p-6 rounded-2xl border-2 bg-gradient-to-br ${colorClass} hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl ${accentClass} flex items-center justify-center shrink-0`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold mb-1 truncate">
                        {dept.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        100 Level Courses
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
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
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No departments available</p>
          </motion.div>
        )}
      </main>

      <BottomNav isLoggedIn={!!session} userId={user?.id} />
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
