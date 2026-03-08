import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border/40 dark:border-white/[0.06] dark:shadow-[0_1px_0_0_hsl(0_0%_100%/0.04)]">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted)/0.3)_1px,transparent_1px)] bg-[size:4rem_4rem] dark:opacity-[0.4]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />

      {/* Light mode hero warm glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[hsl(25_80%_65%/0.07)] blur-[140px] dark:hidden" />

      {/* Dark mode hero radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.06] blur-[120px] hidden dark:block" />

      <div className="relative container mx-auto px-4 py-24 md:py-36 lg:py-44 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/50 text-xs text-muted-foreground mb-2">
            <BookOpen className="w-3 h-3" />
            Free to use · Built for students
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
            The easiest way to organize
            <br />
            <span className="text-primary">your academic PDFs.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Upload, organize, and access your course materials in one place.
            Built for students who are tired of losing files across WhatsApp groups, downloads, and folders.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button asChild size="lg" className="gap-2 text-base px-8 h-12 rounded-xl shadow-lg shadow-primary/20">
              <Link to="/auth">
                Start Using PDFNest
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2 text-base px-8 h-12 rounded-xl">
              <Link to="/afit-pdfs">
                Browse AFIT PDFs
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
