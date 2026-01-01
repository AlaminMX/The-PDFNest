import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "pdfnest-ny2026-dismissed";
const AUTO_HIDE_DATE = new Date("2026-01-11T00:00:00"); // After Jan 10, 2026

export function NewYearBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const now = new Date();
    const isDismissed = localStorage.getItem(STORAGE_KEY) === "true";
    const isPastAutoHide = now >= AUTO_HIDE_DATE;

    if (!isDismissed && !isPastAutoHide) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white"
        >
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/40 rounded-full"
                initial={{ 
                  x: Math.random() * 100 + "%", 
                  y: -10,
                  opacity: 0.6 
                }}
                animate={{ 
                  y: "100%",
                  opacity: 0 
                }}
                transition={{ 
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
              />
            ))}
          </div>

          <div className="container mx-auto px-4 py-3 relative z-10">
            <div className="flex items-center justify-center gap-3">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <p className="text-sm md:text-base font-medium text-center">
                <span className="font-bold">Happy New Year 2026!</span>
                <span className="hidden sm:inline"> — Wishing you a year of productivity and success with PDFNest!</span>
              </p>
              <Sparkles className="h-5 w-5 animate-pulse" />
              
              <button
                onClick={handleDismiss}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}