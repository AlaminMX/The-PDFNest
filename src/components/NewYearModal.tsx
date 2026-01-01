import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/Confetti";

interface NewYearModalProps {
  userName?: string | null;
  onClose: () => void;
}

export function NewYearModal({ userName, onClose }: NewYearModalProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8"
      >
        {/* Transparent backdrop with blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Confetti */}
        {showConfetti && <Confetti />}

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="relative z-10 w-full max-w-lg mx-auto"
        >
          {/* Card with dark glassmorphism */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/95 via-neutral-900/95 to-zinc-950/95 backdrop-blur-xl shadow-2xl">
            {/* Animated glow border effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-rose-500/20 opacity-50" />
            
            {/* Inner sparkles */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-amber-400/60"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    scale: [0, 1.5, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 3,
                  }}
                />
              ))}
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>

            {/* Content */}
            <div className="relative z-10 px-8 py-12 text-center">
              {/* Top sparkle */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="mb-6"
              >
                <Sparkles className="w-8 h-8 text-amber-400/80 mx-auto" />
              </motion.div>

              {/* Main greeting */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-sm uppercase tracking-[0.3em] text-amber-400/70 mb-2 font-medium">
                  Welcome to
                </p>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                  Happy New Year
                </h1>
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.3 }}
                  className="text-6xl md:text-7xl font-black bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 bg-clip-text text-transparent"
                >
                  2026
                </motion.div>
              </motion.div>

              {/* Decorative line */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5 }}
                className="w-24 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent mx-auto my-6"
              />

              {/* User name */}
              {userName && (
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mb-8"
                >
                  <p className="text-zinc-400 text-sm mb-1">Hey there,</p>
                  <p className="text-2xl md:text-3xl font-semibold text-white">
                    {userName}
                  </p>
                </motion.div>
              )}

              {/* CTA Button */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <Button
                  onClick={onClose}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold px-8 py-5 rounded-full text-base shadow-lg shadow-amber-500/20"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Let's Go
                </Button>
              </motion.div>

              {/* Bottom decoration */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="mt-8 flex justify-center gap-2"
              >
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-amber-400/40"
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  />
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}