import { motion } from "framer-motion";
import { MessageSquare, Download, Folder, AlertTriangle } from "lucide-react";

const problems = [
  { icon: MessageSquare, text: "Buried in WhatsApp groups" },
  { icon: Download, text: "Lost in Telegram channels" },
  { icon: Folder, text: "Forgotten in laptop folders" },
  { icon: AlertTriangle, text: "Missing right before exams" },
];

export function ProblemSection() {
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
            Students shouldn't have to hunt for PDFs.
          </h2>
          <p className="text-muted-foreground text-lg">
            Important course materials are scattered everywhere.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {problems.map((item, i) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border border-border/50 bg-muted/30"
            >
              <item.icon className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground text-center leading-snug">{item.text}</span>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-xl font-semibold text-primary"
        >
          PDFNest fixes that.
        </motion.p>
      </div>
    </section>
  );
}
