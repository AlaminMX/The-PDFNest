import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Confetti } from "@/components/Confetti";
import { BADGE_CONFIG } from "@/components/ContributorBadges";
import { ContributorBadge } from "@/hooks/useContributorStats";
import { Button } from "@/components/ui/button";

const SEEN_BADGES_KEY = "pdfnest-seen-badges";

function getSeenBadges(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_BADGES_KEY) || "[]");
  } catch {
    return [];
  }
}

function markBadgeSeen(badgeType: string) {
  const seen = getSeenBadges();
  if (!seen.includes(badgeType)) {
    seen.push(badgeType);
    localStorage.setItem(SEEN_BADGES_KEY, JSON.stringify(seen));
  }
}

interface BadgeCelebrationProps {
  badges: ContributorBadge[];
}

export function BadgeCelebration({ badges }: BadgeCelebrationProps) {
  const navigate = useNavigate();
  const [celebratingBadge, setCelebratingBadge] = useState<string | null>(null);

  useEffect(() => {
    if (!badges || badges.length === 0) return;
    const seen = getSeenBadges();
    const unseen = badges.find((b) => !seen.includes(b.badge_type));
    if (unseen) {
      setCelebratingBadge(unseen.badge_type);
    }
  }, [badges]);

  const handleDismiss = () => {
    if (celebratingBadge) {
      markBadgeSeen(celebratingBadge);
    }
    setCelebratingBadge(null);
  };

  const handleViewProfile = () => {
    if (celebratingBadge) {
      markBadgeSeen(celebratingBadge);
    }
    setCelebratingBadge(null);
    navigate("/profile");
  };

  const config = celebratingBadge ? BADGE_CONFIG[celebratingBadge] : null;

  return (
    <AnimatePresence>
      {celebratingBadge && config && (
        <>
          <Confetti />
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
          >
            <motion.div
              className="relative bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
              initial={{ scale: 0.7, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/20 via-transparent to-primary/20 pointer-events-none" />

              {/* Badge emoji */}
              <motion.div
                className="text-6xl mb-4"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.2, damping: 12 }}
              >
                {config.emoji}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  Badge Earned
                </p>
                <h2 className="text-xl font-bold mb-2">{config.label}</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {config.description}
                </p>
              </motion.div>

              <motion.div
                className="flex flex-col gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button onClick={handleViewProfile} className="w-full">
                  View on Profile
                </Button>
                <Button variant="ghost" onClick={handleDismiss} className="w-full text-xs">
                  Dismiss
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
