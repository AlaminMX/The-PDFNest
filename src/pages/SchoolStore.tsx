import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShoppingBag, Bell, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";

const waitlistSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().trim().email("Invalid email address").max(255),
  whatsapp_number: z
    .string()
    .trim()
    .min(7, "WhatsApp number too short")
    .max(15, "WhatsApp number too long")
    .regex(/^\+?[0-9]{7,15}$/, "Enter a valid WhatsApp number (digits only, optional + prefix)"),
});

function SchoolStoreContent() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    setErrors({});
    const result = waitlistSchema.safeParse({
      name,
      email,
      whatsapp_number: whatsapp,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        const field = e.path[0] as string;
        fieldErrors[field] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("store_waitlist" as any).insert({
        name: result.data.name,
        email: result.data.email,
        whatsapp_number: result.data.whatsapp_number,
        user_id: user.id,
      } as any);

      if (error) throw error;

      setSubmitted(true);
      toast.success("You're on the waitlist! We'll notify you when the store launches.");
    } catch (error: any) {
      console.error("Waitlist submission error:", error);
      toast.error("Failed to join waitlist. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-64 h-64 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-64 h-64 rounded-full bg-gradient-to-br from-red-500/10 to-pink-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/afit-pdfs")}
              className="rounded-full h-9 w-9"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">School Store</h1>
              <p className="text-xs text-muted-foreground">Coming Soon</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg mx-auto text-center"
        >
          {/* Hero Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative inline-block mb-8"
          >
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-2xl shadow-orange-500/30 mx-auto">
              <ShoppingBag className="w-16 h-16 text-white" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-2 -right-2"
            >
              <Sparkles className="w-8 h-8 text-amber-500" />
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent"
          >
            School Store
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-muted-foreground mb-8 max-w-sm mx-auto"
          >
            Your one-stop shop for snacks, supplies, and campus essentials is coming soon!
          </motion.p>

          {/* Features Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            {[
              { emoji: "🍕", label: "Food" },
              { emoji: "📦", label: "Supplies" },
              { emoji: "☕", label: "Drinks" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50"
              >
                <span className="text-3xl block mb-2">{item.emoji}</span>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Waitlist Form */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-left space-y-4 mb-6"
          >
            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-6 px-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
                <p className="text-sm font-medium text-green-600 dark:text-green-400 text-center">
                  You're on the waitlist! We'll reach out when the store is ready.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="waitlist-name">Name</Label>
                  <Input
                    id="waitlist-name"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="waitlist-email">Email</Label>
                  <Input
                    id="waitlist-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="waitlist-whatsapp">WhatsApp Number</Label>
                  <Input
                    id="waitlist-whatsapp"
                    type="tel"
                    placeholder="+2348012345678"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    maxLength={15}
                  />
                  {errors.whatsapp_number && (
                    <p className="text-xs text-destructive">{errors.whatsapp_number}</p>
                  )}
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-orange-500/25"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                  {submitting ? "Joining..." : "Notify Me When It Launches"}
                </Button>
              </>
            )}
          </motion.div>

          {/* Placeholder for future ads */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-12 p-6 rounded-2xl border border-dashed border-border/50 bg-muted/10"
          >
            <p className="text-xs text-muted-foreground/50">
              Advertisement space • Partner with us
            </p>
          </motion.div>
        </motion.div>
      </main>

      <SmartBottomNav />
    </div>
  );
}

export default function SchoolStore() {
  return (
    <AuthGate>
      <SchoolStoreContent />
    </AuthGate>
  );
}
