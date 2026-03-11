import { motion } from "framer-motion";

export function TrustSection() {
  return (
    <section className="py-20 md:py-28 border-b border-border/40 dark:border-white/[0.06]">
      <div className="container mx-auto px-4 max-w-3xl text-center space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Built for real students.
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            PDFNest helps students keep their course materials organized and accessible — no more last-minute scrambles before exams.
          </p>
        </motion.div>

        <div className="grid grid-cols-3 gap-6">
          {[
            { value: "10+", label: "Departments" },
            { value: "500+", label: "Resources" },
            { value: "Growing", label: "Community" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="p-6 rounded-xl border border-border/50 bg-muted/30 dark:bg-white/[0.03] dark:border-white/[0.06]"
            >
              <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
