import { useNavigate } from "react-router-dom";
import { useDepartments } from "@/hooks/useDepartments";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, ShoppingBag, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { motion } from "framer-motion";
import { DepartmentTile } from "@/components/DepartmentTile";

function AFITPDFsContent() {
  const navigate = useNavigate();
  const { departments, loading } = useDepartments();

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
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-5 rounded-xl bg-muted/30 border border-border/30">
                  <div className="h-4 w-1/3 bg-muted/50 rounded mb-2" />
                  <div className="h-3 w-2/3 bg-muted/50 rounded" />
                </div>
              ))
            : departments.map((dept, index) => (
                <DepartmentTile
                  key={dept.id}
                  id={dept.id}
                  name={dept.name}
                  color={(dept as any).color}
                  icon={(dept as any).icon}
                  index={index}
                  onClick={() => navigate(`/afit-pdfs/${dept.slug}`)}
                />
              ))}

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

          {!loading && departments.length === 0 && (
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