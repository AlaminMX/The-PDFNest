import { motion } from "framer-motion";
import { Upload, FolderOpen, Smartphone, WifiOff, Users } from "lucide-react";

const solutions = [
  { icon: Upload, text: "Upload your PDFs" },
  { icon: FolderOpen, text: "Organize them by department and semester" },
  { icon: Smartphone, text: "Access them anytime" },
  { icon: WifiOff, text: "Save important files offline" },
  { icon: Users, text: "Share materials with classmates" },
];

export function SolutionSection() {
  return (
    <section className="py-20 md:py-28 border-b border-border/40 dark:border-white/[0.06] bg-muted/20 dark:bg-white/[0.02]">
      <div className="container mx-auto px-4 max-w-3xl text-center space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            One place for every academic PDF.
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Instead of searching everywhere, everything lives in one organized library.
          </p>
        </motion.div>

        <div className="space-y-3 max-w-md mx-auto text-left">
          {solutions.map((item, i) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-background dark:bg-white/[0.03] dark:border-white/[0.06]"
            >
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
