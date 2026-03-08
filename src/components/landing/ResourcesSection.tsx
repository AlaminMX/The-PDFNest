import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { GraduationCap, ArrowRight } from "lucide-react";

export function ResourcesSection() {
  return (
    <section className="py-20 md:py-28 border-b border-border/40 bg-muted/20">
      <div className="container mx-auto px-4 max-w-3xl text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <GraduationCap className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            AFIT Resources
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Browse shared materials organized by faculty, department, and semester.
            Access lecture notes uploaded by course reps across departments.
          </p>
        </motion.div>

        <Button asChild size="lg" className="gap-2 rounded-xl h-12 px-8">
          <Link to="/afit-pdfs">
            Explore AFIT PDFs
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
