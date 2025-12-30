import { useNavigate } from "react-router-dom";
import { useDepartments } from "@/hooks/useDepartments";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, ShoppingBag, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { motion } from "framer-motion";

// Color mapping for department colors
const colorMap: Record<string, { bg: string; accent: string; glow: string }> = {
  blue: { bg: "bg-blue-500/5 hover:bg-blue-500/8", accent: "bg-blue-500/10 text-blue-600 dark:text-blue-400", glow: "shadow-blue-500/20" },
  emerald: { bg: "bg-emerald-500/5 hover:bg-emerald-500/8", accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", glow: "shadow-emerald-500/20" },
  green: { bg: "bg-green-500/5 hover:bg-green-500/8", accent: "bg-green-500/10 text-green-600 dark:text-green-400", glow: "shadow-green-500/20" },
  purple: { bg: "bg-purple-500/5 hover:bg-purple-500/8", accent: "bg-purple-500/10 text-purple-600 dark:text-purple-400", glow: "shadow-purple-500/20" },
  red: { bg: "bg-red-500/5 hover:bg-red-500/8", accent: "bg-red-500/10 text-red-600 dark:text-red-400", glow: "shadow-red-500/20" },
  orange: { bg: "bg-orange-500/5 hover:bg-orange-500/8", accent: "bg-orange-500/10 text-orange-600 dark:text-orange-400", glow: "shadow-orange-500/20" },
  yellow: { bg: "bg-yellow-500/5 hover:bg-yellow-500/8", accent: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400", glow: "shadow-yellow-500/20" },
  pink: { bg: "bg-pink-500/5 hover:bg-pink-500/8", accent: "bg-pink-500/10 text-pink-600 dark:text-pink-400", glow: "shadow-pink-500/20" },
  indigo: { bg: "bg-indigo-500/5 hover:bg-indigo-500/8", accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", glow: "shadow-indigo-500/20" },
  teal: { bg: "bg-teal-500/5 hover:bg-teal-500/8", accent: "bg-teal-500/10 text-teal-600 dark:text-teal-400", glow: "shadow-teal-500/20" },
  cyan: { bg: "bg-cyan-500/5 hover:bg-cyan-500/8", accent: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400", glow: "shadow-cyan-500/20" },
  silver: { bg: "bg-slate-400/5 hover:bg-slate-400/8", accent: "bg-slate-400/10 text-slate-600 dark:text-slate-400", glow: "shadow-slate-400/20" },
  gold: { bg: "bg-amber-500/5 hover:bg-amber-500/8", accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400", glow: "shadow-amber-500/20" },
};

// Default colors for auto-generation
const defaultColors = ["blue", "emerald", "purple", "orange", "teal", "pink", "indigo", "cyan"];

// Default icons based on department name keywords
const defaultIcons: Record<string, string> = {
  computer: "💻",
  cyber: "🔒",
  security: "🛡️",
  engineering: "⚙️",
  science: "🔬",
  math: "📐",
  physics: "⚛️",
  chemistry: "🧪",
  biology: "🧬",
  medicine: "🏥",
  law: "⚖️",
  business: "💼",
  economics: "📊",
  art: "🎨",
  music: "🎵",
  history: "📜",
  language: "🗣️",
  education: "📚",
};

function getColorClasses(color: string | null, index: number): { bg: string; accent: string; glow: string } {
  if (color) {
    const normalizedColor = color.toLowerCase().trim();
    // Check direct match
    if (colorMap[normalizedColor]) return colorMap[normalizedColor];
    // Check partial match
    for (const key of Object.keys(colorMap)) {
      if (normalizedColor.includes(key)) return colorMap[key];
    }
  }
  // Auto-generate based on index
  const autoColor = defaultColors[index % defaultColors.length];
  return colorMap[autoColor];
}

function getDepartmentIcon(icon: string | null, name: string): string {
  if (icon && icon.trim()) return icon.trim();
  // Auto-assign based on department name
  const nameLower = name.toLowerCase();
  for (const [keyword, emoji] of Object.entries(defaultIcons)) {
    if (nameLower.includes(keyword)) return emoji;
  }
  return "📚"; // Default icon
}

function AFITPDFsContent() {
  const navigate = useNavigate();
  const { departments, loading } = useDepartments();

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
              <p className="text-xs text-muted-foreground">Academic Resources</p>
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
          {departments.map((dept, index) => {
            const colors = getColorClasses((dept as any).color, index);
            const icon = getDepartmentIcon((dept as any).icon, dept.name);
            
            return (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
              >
                <button
                  onClick={() => navigate(`/afit-pdfs/${dept.slug}`)}
                  className={`w-full text-left p-5 rounded-xl ${colors.bg} transition-all duration-200 group`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg ${colors.accent} flex items-center justify-center shrink-0 shadow-lg ${colors.glow}`}>
                      <span className="text-2xl">{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium mb-0.5">
                        {dept.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        View Courses
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              </motion.div>
            );
          })}

          {/* School Store Tile */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: departments.length * 0.08 }}
          >
            <button
              onClick={() => navigate("/school-store")}
              className="w-full text-left p-5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 hover:from-amber-500/15 hover:via-orange-500/15 hover:to-red-500/15 border border-amber-500/20 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/30">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium mb-0.5">
                    School Store
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Coming Soon
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          </motion.div>
        </div>

        {departments.length === 0 && (
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