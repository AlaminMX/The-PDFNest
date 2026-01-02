import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NewYearModal } from "./NewYearModal";

const STORAGE_KEY = "pdfnest-ny2026-dismissed";
const MODAL_KEY = "pdfnest-ny2026-modal-shown";
const AUTO_HIDE_DATE = new Date("2026-01-11T00:00:00"); // After Jan 10, 2026

interface NewYearBannerProps {
  userName?: string | null;
}

// Mini firework burst for the banner
function BannerFirework({ delay }: { delay: number }) {
  const colors = ['#3b82f6', '#1d4ed8', '#ef4444', '#dc2626', '#8b5cf6', '#22c55e', '#eab308'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  
  return (
    <div className="absolute" style={{ 
      left: `${10 + Math.random() * 80}%`, 
      top: `${20 + Math.random() * 60}%` 
    }}>
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 h-0.5 rounded-full"
          style={{ backgroundColor: randomColor }}
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{
            x: Math.cos((i * Math.PI * 2) / 8) * 12,
            y: Math.sin((i * Math.PI * 2) / 8) * 12,
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 0.8,
            delay: delay,
            repeat: Infinity,
            repeatDelay: 3 + Math.random() * 4,
          }}
        />
      ))}
    </div>
  );
}

export function NewYearBanner({ userName }: NewYearBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const now = new Date();
    const isDismissed = localStorage.getItem(STORAGE_KEY) === "true";
    const isPastAutoHide = now >= AUTO_HIDE_DATE;
    const hasSeenModal = localStorage.getItem(MODAL_KEY) === "true";

    if (!isPastAutoHide) {
      setIsVisible(!isDismissed);
      
      // Show modal on first visit only
      if (!hasSeenModal) {
        setShowModal(true);
        localStorage.setItem(MODAL_KEY, "true");
      }
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  };

  const handleBannerClick = () => {
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  return (
    <>
      {/* Full-screen modal */}
      {showModal && (
        <NewYearModal userName={userName} onClose={handleModalClose} />
      )}

      {/* Banner - dark blue to red gradient */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-800 to-red-700 text-white cursor-pointer"
            onClick={handleBannerClick}
          >
            {/* Tiny fireworks */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <BannerFirework key={i} delay={i * 0.5} />
              ))}
            </div>
            
            {/* Animated sparkle particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(15)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  initial={{ 
                    x: Math.random() * 100 + "%", 
                    y: Math.random() * 100 + "%",
                    opacity: 0 
                  }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 2 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2
                  }}
                >
                  <Sparkles className="w-3 h-3 text-white/40" />
                </motion.div>
              ))}
            </div>

            <div className="container mx-auto px-4 py-3 relative z-10">
              <div className="flex items-center justify-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="h-5 w-5" />
                </motion.div>
                <p className="text-sm md:text-base font-medium text-center">
                  <span className="font-bold">Happy New Year 2026!</span>
                  <span className="hidden sm:inline"> — Click to celebrate with us!</span>
                </p>
                <motion.div
                  animate={{ rotate: [0, -15, 15, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="h-5 w-5" />
                </motion.div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                  }}
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
    </>
  );
}
