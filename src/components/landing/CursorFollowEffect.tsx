import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  type: number;
}

export function CursorFollowEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number>(0);
  const isTouchRef = useRef(false);

  const initParticles = useCallback(() => {
    const particles: Particle[] = [];
    for (let i = 0; i < 7; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        targetX: 0,
        targetY: 0,
        speed: 0.02 + Math.random() * 0.03,
        size: 14 + Math.random() * 10,
        opacity: 0.04 + Math.random() * 0.06,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.5,
        type: Math.floor(Math.random() * 3),
      });
    }
    particlesRef.current = particles;
  }, []);

  const drawDocument = useCallback(
    (ctx: CanvasRenderingContext2D, p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;

      const s = p.size;
      const color = "hsl(var(--foreground))";
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.fillStyle = "transparent";

      if (p.type === 0) {
        // Simple document with fold
        ctx.beginPath();
        ctx.moveTo(-s / 2, -s * 0.7);
        ctx.lineTo(s / 4, -s * 0.7);
        ctx.lineTo(s / 2, -s * 0.45);
        ctx.lineTo(s / 2, s * 0.7);
        ctx.lineTo(-s / 2, s * 0.7);
        ctx.closePath();
        ctx.stroke();
        // Fold line
        ctx.beginPath();
        ctx.moveTo(s / 4, -s * 0.7);
        ctx.lineTo(s / 4, -s * 0.45);
        ctx.lineTo(s / 2, -s * 0.45);
        ctx.stroke();
        // Text lines
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-s * 0.3, -s * 0.15 + i * s * 0.22);
          ctx.lineTo(s * 0.3, -s * 0.15 + i * s * 0.22);
          ctx.stroke();
        }
      } else if (p.type === 1) {
        // PDF badge
        ctx.beginPath();
        ctx.roundRect(-s / 2, -s * 0.6, s, s * 1.2, 3);
        ctx.stroke();
        ctx.font = `bold ${s * 0.32}px sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("PDF", 0, 0);
      } else {
        // Stacked pages
        ctx.beginPath();
        ctx.rect(-s / 2 + 3, -s * 0.65 + 3, s - 2, s * 1.15);
        ctx.stroke();
        ctx.beginPath();
        ctx.rect(-s / 2, -s * 0.65, s - 2, s * 1.15);
        ctx.stroke();
      }

      ctx.restore();
    },
    []
  );

  useEffect(() => {
    if ("ontouchstart" in window) {
      isTouchRef.current = true;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    initParticles();

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const p of particlesRef.current) {
        // Offset each particle around cursor
        const offsetX = (Math.sin(p.speed * 100) * 120);
        const offsetY = (Math.cos(p.speed * 100) * 120);
        p.targetX = mx + offsetX;
        p.targetY = my + offsetY;

        p.x += (p.targetX - p.x) * p.speed;
        p.y += (p.targetY - p.y) * p.speed;
        p.rotation += p.rotationSpeed;

        drawDocument(ctx, p);
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", resize);
    };
  }, [initParticles, drawDocument]);

  if (typeof window !== "undefined" && "ontouchstart" in window) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 hidden md:block"
      aria-hidden="true"
    />
  );
}
