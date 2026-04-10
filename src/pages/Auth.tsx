import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SignupWizard } from "@/components/signup/SignupWizard";
import { toast } from "sonner";
import { z } from "zod";
import { motion } from "framer-motion";
import { logActivity } from "@/lib/sessionLogger";
import { Loader2 } from "lucide-react";

const authSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export default function Auth() {
  const navigate = useNavigate();

  const isFirstTimeVisitor = !localStorage.getItem("hasVisitedBefore");
  const [isLogin, setIsLogin] = useState(!isFirstTimeVisitor);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const isOnboarding = useRef(false);

  useEffect(() => {
    localStorage.setItem("hasVisitedBefore", "true");

    supabase.auth.getSession().then(({ data: { session } }) => {
      // Skip auto-redirect if the URL contains recovery params —
      // let the RecoveryRedirect interceptor or PASSWORD_RECOVERY event handle it.
      const hash = window.location.hash;
      const qp = new URLSearchParams(window.location.search);
      const isRecovery =
        hash.includes("type=recovery") ||
        qp.get("type") === "recovery" ||
        qp.has("code");

      if (session && !isOnboarding.current && !isRecovery) {
        const redirectTo = sessionStorage.getItem("redirectAfterLogin");
        if (redirectTo) {
          sessionStorage.removeItem("redirectAfterLogin");
          navigate(redirectTo, { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // PASSWORD_RECOVERY fires when the user arrives via a reset-password email link.
      // Send them to /reset-password so they can set a new password.
      if (event === "PASSWORD_RECOVERY") {
        navigate("/reset-password", { replace: true });
        return;
      }

      // For a normal SIGNED_IN, navigate away from the auth page.
      // But if we're on /reset-password (recovery redirect in progress),
      // do NOT navigate — the ResetPassword page must handle the session.
      if (event === "SIGNED_IN" && session && !isOnboarding.current) {
        if (window.location.pathname === "/reset-password") return;
        const redirectTo = sessionStorage.getItem("redirectAfterLogin");
        if (redirectTo) {
          sessionStorage.removeItem("redirectAfterLogin");
          navigate(redirectTo, { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleStartOnboarding = () => { isOnboarding.current = true; };
  const handleFinishOnboarding = () => { isOnboarding.current = false; navigate("/dashboard"); };
  const handleAbortOnboarding = () => { isOnboarding.current = false; };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      authSchema.parse({ email, password });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      if (!rememberMe) {
        sessionStorage.setItem("tempSession", "true");
      } else {
        sessionStorage.removeItem("tempSession");
      }
      toast.success("Welcome back!");
    } catch (error: any) {
      logActivity("login_failed", {
        provider: "email_password",
        reason: error?.message ?? "unknown",
      }).catch(() => {});
      toast.error(error.message || "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      z.string().email().parse(email);
    } catch {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent! Check your inbox.");
      setIsForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isLogin && !isForgotPassword) {
    return (
      <SignupWizard
        onSwitchToLogin={() => setIsLogin(true)}
        onStartOnboarding={handleStartOnboarding}
        onFinishOnboarding={handleFinishOnboarding}
        onAbortOnboarding={handleAbortOnboarding}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <div className="absolute inset-0 bg-gradient-to-tl from-primary/10 via-transparent to-accent/10 pointer-events-none" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 120, 0], y: [0, -60, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] bg-gradient-to-tr from-accent/40 to-primary/20 rounded-full blur-3xl"
        />
      </div>

      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-center mb-8 space-y-4"
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden"
          >
            <img src="/pdfnest-logo.png" alt="PDFNest" className="w-full h-full object-contain" />
          </motion.div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">PDFNest</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-2">
              {isForgotPassword ? "Reset your password" : "Welcome back"}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-card/80 backdrop-blur-sm rounded-xl shadow-lg p-6 md:p-8 border border-border/50 space-y-6"
        >
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setIsLogin(true); }}
                  className="text-sm text-primary hover:underline"
                  disabled={loading}
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <label htmlFor="rememberMe" className="text-sm text-muted-foreground leading-none cursor-pointer">
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          )}

          {!isForgotPassword && (
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </button>
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-6 text-center text-sm text-muted-foreground"
        >
          <Link to="/terms" className="hover:text-foreground hover:underline transition-colors">
            Terms &amp; Conditions
          </Link>
          <span className="mx-2">•</span>
          <Link to="/privacy" className="hover:text-foreground hover:underline transition-colors">
            Privacy Policy
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
                            }
  
