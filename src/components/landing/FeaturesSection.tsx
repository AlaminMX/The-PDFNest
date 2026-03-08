import { motion } from "framer-motion";
import { FolderOpen, Search, Cloud, WifiOff, Users, Zap } from "lucide-react";

const features = [
  {
    icon: FolderOpen,
    title: "Organized by Department & Semester",
    desc: "Find your materials exactly where you'd expect them.",
  },
  {
    icon: Search,
    title: "Fast Search for PDFs",
    desc: "Locate any document in seconds with powerful search.",
  },
  {
    icon: Cloud,
    title: "Secure Cloud Storage",
    desc: "Your files are safe and available from any device.",
  },
  {
    icon: WifiOff,
    title: "Offline Access",
    desc: "Download files for use when you're without internet.",
  },
  {
    icon: Users,
    title: "Course Rep Contributions",
    desc: "Reps upload shared materials for the entire department.",
  },
  {
    icon: Zap,
    title: "Simple & Fast Interface",
    desc: "No clutter, no learning curve — just your files.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-28 border-b border-border/40">
      <div className="container mx-auto px-4 max-w-5xl space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-4"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Everything you need, nothing you don't.
          </h2>
          <p className="text-muted-foreground text-lg">
            Simple tools designed around how students actually work.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="p-6 rounded-xl border border-border/50 bg-card hover:border-border transition-colors space-y-3"
            >
              <div className="p-2.5 rounded-lg bg-primary/10 w-fit">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
