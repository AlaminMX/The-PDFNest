import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/Confetti";

interface NewYearModalProps {
  userName?: string | null;
  onClose: () => void;
}

// Mini firework burst component
function MiniBurst({ delay, x, y }: { delay: number; x: number; y: number }) {
  const colors = ['#3b82f6', '#1d4ed8', '#ef4444', '#dc2626', '#8b5cf6', '#06b6d4'];
  
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{ backgroundColor: colors[i % colors.length] }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{
            x: Math.cos((i * Math.PI * 2) / 6) * 15,
            y: Math.sin((i * Math.PI * 2) / 6) * 15,
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 1.2,
            delay: delay,
            repeat: Infinity,
            repeatDelay: 2 + Math.random() * 3,
          }}
        />
      ))}
    </div>
  );
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
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
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
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/95 via-zinc-900/95 to-slate-950/95 backdrop-blur-xl shadow-2xl">
            {/* Animated glow border effect - dark blue to red */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-900/30 via-indigo-800/20 to-red-600/30 opacity-60" />
            
            {/* Mini fireworks on the card */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
              <MiniBurst delay={0} x={15} y={20} />
              <MiniBurst delay={0.5} x={85} y={25} />
              <MiniBurst delay={1} x={20} y={75} />
              <MiniBurst delay={1.5} x={80} y={80} />
              <MiniBurst delay={2} x={50} y={15} />
              <MiniBurst delay={2.5} x={10} y={50} />
              <MiniBurst delay={3} x={90} y={55} />
            </div>
            
            {/* Inner sparkles - dark blue and red */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: i % 2 === 0 ? '#3b82f6' : '#ef4444',
                  }}
                  animate={{
                    scale: [0, 1.5, 0],
                    opacity: [0, 0.8, 0],
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
                <Sparkles className="w-8 h-8 text-blue-400/80 mx-auto" />
              </motion.div>

              {/* Main greeting - New structure */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  Happy New Year
                </h1>
                
                {/* User name - prominently displayed */}
                {userName && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", delay: 0.3 }}
                    className="mb-4"
                  >
                    <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-red-400 bg-clip-text text-transparent">
                      {userName}
                    </p>
                  </motion.div>
                )}
                
                <p className="text-lg text-zinc-400 mb-2">
                  welcome to
                </p>
                
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.4 }}
                  className="text-6xl md:text-7xl font-black bg-gradient-to-r from-blue-500 via-indigo-500 to-red-500 bg-clip-text text-transparent"
                >
                  2026
                </motion.div>
              </motion.div>

              {/* Decorative line - dark blue to red */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5 }}
                className="w-32 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent mx-auto my-6"
              />

              {/* CTA Button - dark blue to red gradient */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  onClick={onClose}
                  className="bg-gradient-to-r from-blue-700 to-red-600 hover:from-blue-800 hover:to-red-700 text-white font-semibold px-8 py-5 rounded-full text-base shadow-lg shadow-blue-900/30"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Let's Go
                </Button>
              </motion.div>

              {/* Bottom decoration - blue and red dots */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="mt-8 flex justify-center gap-2"
              >
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: i % 2 === 0 ? '#3b82f6' : '#ef4444' }}
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
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
