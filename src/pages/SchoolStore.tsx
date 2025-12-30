import { useNavigate } from "react-router-dom";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag, Bell, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { motion } from "framer-motion";
import { toast } from "sonner";

function SchoolStoreContent() {
  const navigate = useNavigate();

  const handleNotifyMe = () => {
    toast.success("You'll be notified when the store launches!");
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-64 h-64 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-64 h-64 rounded-full bg-gradient-to-br from-red-500/10 to-pink-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/afit-pdfs")}
              className="rounded-full h-9 w-9"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">School Store</h1>
              <p className="text-xs text-muted-foreground">Coming Soon</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg mx-auto text-center"
        >
          {/* Hero Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative inline-block mb-8"
          >
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-2xl shadow-orange-500/30 mx-auto">
              <ShoppingBag className="w-16 h-16 text-white" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-2 -right-2"
            >
              <Sparkles className="w-8 h-8 text-amber-500" />
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent"
          >
            School Store
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-muted-foreground mb-8 max-w-sm mx-auto"
          >
            Your one-stop shop for snacks, supplies, and campus essentials is coming soon!
          </motion.p>

          {/* Features Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            {[
              { emoji: "🍕", label: "Food" },
              { emoji: "📦", label: "Supplies" },
              { emoji: "☕", label: "Drinks" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50"
              >
                <span className="text-3xl block mb-2">{item.emoji}</span>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Button 
              onClick={handleNotifyMe}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-orange-500/25"
            >
              <Bell className="w-4 h-4" />
              Notify Me When It Launches
            </Button>
          </motion.div>

          {/* Placeholder for future ads */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-12 p-6 rounded-2xl border border-dashed border-border/50 bg-muted/10"
          >
            <p className="text-xs text-muted-foreground/50">
              Advertisement space • Partner with us
            </p>
          </motion.div>
        </motion.div>
      </main>

      <SmartBottomNav />
    </div>
  );
}

export default function SchoolStore() {
  return (
    <AuthGate>
      <SchoolStoreContent />
    </AuthGate>
  );
}