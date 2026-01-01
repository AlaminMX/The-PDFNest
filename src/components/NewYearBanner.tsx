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

      {/* Banner */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white cursor-pointer"
            onClick={handleBannerClick}
          >
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
                  <Sparkles className="w-3 h-3 text-white/50" />
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