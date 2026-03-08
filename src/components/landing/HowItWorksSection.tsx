import { motion } from "framer-motion";

const steps = [
  { step: "1", title: "Create an account", desc: "Sign up in less than a minute with your email." },
  { step: "2", title: "Upload or browse", desc: "Add your own PDFs or browse shared resources." },
  { step: "3", title: "Access anytime", desc: "Your materials are ready whenever you need them." },
];

export function HowItWorksSection() {
  return (
    <section className="py-20 md:py-28 border-b border-border/40 dark:border-white/[0.06] bg-muted/20 dark:bg-white/[0.02]">
      <div className="container mx-auto px-4 max-w-3xl space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-4"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Get started in three steps.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto">
                {s.step}
              </div>
              <h3 className="font-semibold text-foreground text-lg">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
