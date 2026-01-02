import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FireworkBurst {
  id: number;
  x: number;
  y: number;
  color: string;
  particles: Array<{ angle: number; distance: number; size: number }>;
}

interface FireworksProps {
  bursts: FireworkBurst[];
  onComplete: (id: number) => void;
}

const COLORS = [
  '#3b82f6', // blue
  '#1d4ed8', // dark blue
  '#ef4444', // red
  '#dc2626', // dark red
  '#22c55e', // green
  '#eab308', // yellow
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
];

function FireworkBurstComponent({ burst, onComplete }: { burst: FireworkBurst; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className="absolute pointer-events-none"
      style={{ left: burst.x, top: burst.y }}
    >
      {burst.particles.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: burst.color,
            boxShadow: `0 0 ${particle.size * 2}px ${burst.color}, 0 0 ${particle.size * 4}px ${burst.color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(particle.angle) * particle.distance,
            y: Math.sin(particle.angle) * particle.distance,
            opacity: [1, 1, 0],
            scale: [1, 0.8, 0],
          }}
          transition={{
            duration: 1.2,
            ease: "easeOut",
          }}
        />
      ))}
      
      {/* Center flash */}
      <motion.div
        className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 20,
          height: 20,
          backgroundColor: 'white',
          boxShadow: `0 0 30px white, 0 0 60px ${burst.color}`,
        }}
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 0, scale: 0 }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}

export function Fireworks({ bursts, onComplete }: FireworksProps) {
  return (
    <div className="fixed inset-0 z-[300] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {bursts.map((burst) => (
          <FireworkBurstComponent
            key={burst.id}
            burst={burst}
            onComplete={() => onComplete(burst.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useFireworks() {
  const [bursts, setBursts] = useState<FireworkBurst[]>([]);
  const idRef = useRef(0);

  const triggerFirework = (clientX?: number, clientY?: number) => {
    const x = clientX ?? window.innerWidth / 2 + (Math.random() - 0.5) * 200;
    const y = clientY ?? window.innerHeight / 2 + (Math.random() - 0.5) * 200;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    // Create particles with random angles and distances
    const particleCount = 20 + Math.floor(Math.random() * 15);
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      angle: (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3,
      distance: 80 + Math.random() * 120,
      size: 3 + Math.random() * 4,
    }));

    const newBurst: FireworkBurst = {
      id: idRef.current++,
      x,
      y,
      color,
      particles,
    };

    setBursts((prev) => [...prev, newBurst]);
  };

  const removeBurst = (id: number) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  };

  return {
    bursts,
    triggerFirework,
    removeBurst,
    FireworksComponent: () => <Fireworks bursts={bursts} onComplete={removeBurst} />,
  };
}
