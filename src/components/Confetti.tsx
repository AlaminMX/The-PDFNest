import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
}

const COLORS = [
  "hsl(0, 84%, 60%)",     // Primary red
  "hsl(45, 93%, 58%)",    // Gold
  "hsl(210, 100%, 56%)",  // Blue
  "hsl(142, 71%, 45%)",   // Green
  "hsl(280, 84%, 60%)",   // Purple
];

export function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.5,
        rotation: Math.random() * 360,
      });
    }
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{
            left: `${particle.x}%`,
            top: "-5%",
            rotate: 0,
            opacity: 1,
          }}
          animate={{
            top: "110%",
            rotate: particle.rotation + 720,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2.5 + Math.random(),
            delay: particle.delay,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="absolute"
        >
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: particle.color }}
          />
        </motion.div>
      ))}
    </div>
  );
}
