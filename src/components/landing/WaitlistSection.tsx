import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ShoppingBag, Bell, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const waitlistSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  whatsapp_number: z
    .string()
    .trim()
    .min(7, "WhatsApp number too short")
    .max(15, "WhatsApp number too long")
    .regex(/^\+?[0-9]{7,15}$/, "Enter a valid WhatsApp number"),
});

export function WaitlistSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    setErrors({});
    const result = waitlistSchema.safeParse({ name, email, whatsapp_number: whatsapp });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        fieldErrors[e.path[0] as string] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to join the waitlist.");
        return;
      }
      const { error } = await supabase.from("store_waitlist" as any).insert({
        name: result.data.name,
        email: result.data.email,
        whatsapp_number: result.data.whatsapp_number,
        user_id: user.id,
      } as any);
      if (error) throw error;
      setSubmitted(true);
      toast.success("You're on the waitlist!");
    } catch {
      toast.error("Failed to join waitlist. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-20 md:py-28 border-b border-border/40">
      <div className="container mx-auto px-4 max-w-lg space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Coming Soon: School Store
          </h2>
          <p className="text-muted-foreground text-lg">
            A marketplace for essential student materials. Be the first to know.
          </p>
        </motion.div>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 px-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <p className="text-sm font-medium text-green-600 dark:text-green-400 text-center">
              You're on the waitlist! We'll reach out when the store is ready.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="lp-name">Name</Label>
              <Input id="lp-name" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lp-email">Email</Label>
              <Input id="lp-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lp-whatsapp">WhatsApp Number</Label>
              <Input id="lp-whatsapp" type="tel" placeholder="+2348012345678" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={15} />
              {errors.whatsapp_number && <p className="text-xs text-destructive">{errors.whatsapp_number}</p>}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl h-11"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              {submitting ? "Joining..." : "Join the Waitlist"}
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
