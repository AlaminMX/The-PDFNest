import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/Confetti";

interface NewYearModalProps {
  userName?: string | null;
  onClose: () => void;
}

export function NewYearModal({ userName, onClose }: NewYearModalProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Stop confetti after 4 seconds
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-br from-amber-600 via-orange-500 to-red-600"
        >
          {/* Animated stars/sparkles in background */}
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{
                x: Math.random() * 100 + "%",
                y: Math.random() * 100 + "%",
                scale: 0,
                opacity: 0,
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            >
              <Sparkles className="w-4 h-4 text-white/60" />
            </motion.div>
          ))}

          {/* Radial glow */}
          <div className="absolute inset-0 bg-radial-gradient from-yellow-400/20 via-transparent to-transparent" />
        </motion.div>

        {/* Confetti */}
        {showConfetti && <Confetti />}

        {/* Content */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.8, delay: 0.2 }}
          className="relative z-10 text-center px-8"
        >
          {/* Decorative sparkles around text */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-16 left-1/2 -translate-x-1/2"
          >
            <Sparkles className="w-12 h-12 text-yellow-300" />
          </motion.div>

          {/* Main greeting */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-4 drop-shadow-2xl">
              Happy New Year
            </h1>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.6 }}
              className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 mb-8"
            >
              2026
            </motion.div>
          </motion.div>

          {/* User name */}
          {userName && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mb-12"
            >
              <p className="text-2xl md:text-3xl text-white/90 font-light">
                Welcome,
              </p>
              <p className="text-3xl md:text-5xl font-semibold text-white mt-2 drop-shadow-lg">
                {userName}
              </p>
            </motion.div>
          )}

          {/* Decorative line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1 }}
            className="w-32 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent mx-auto mb-8"
          />

          {/* Close button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <Button
              onClick={onClose}
              size="lg"
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm text-lg px-8 py-6 rounded-full"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Let's Go!
            </Button>
          </motion.div>

          {/* Bottom sparkle */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mt-8"
          >
            <Sparkles className="w-8 h-8 text-yellow-300/60 mx-auto" />
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}