import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { z } from "zod";
import { motion } from "framer-motion";
import { logActivity } from "@/lib/sessionLogger";
import { Loader2 } from "lucide-react";
import {
  getRecoveryRedirectPath,
  getResetPasswordRedirectUrl,
  hasRecoveryParams,
  isRecoveryRedirectInProgress,
} from "@/lib/authRecovery";

const authSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100),
});

// Decide where to send a freshly authenticated user.
async function routeAfterAuth(
  userId: string,
  navigate: (to: string, opts?: any) => void,
) {
  const redirectTo = sessionStorage.getItem("redirectAfterLogin");
  if (redirectTo) {
    sessionStorage.removeItem("redirectAfterLogin");
    navigate(redirectTo, { replace: true });
    return;
  }
  try {
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", userId)
      .maybeSingle();
    if (!data || data.onboarding_complete === false) {
      navigate("/onboarding", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  } catch {
    navigate("/dashboard", { replace: true });
  }
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isFirstTimeVisitor = !localStorage.getItem("hasVisitedBefore");
  const [isLogin, setIsLogin] = useState(() =>
    searchParams.get("mode") === "signin" ? true : !isFirstTimeVisitor,
  );
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const routedRef = useRef(false);

  useEffect(() => {
    if (searchParams.get("mode") === "signin") setIsLogin(true);
    localStorage.setItem("hasVisitedBefore", "true");

    supabase.auth.getSession().then(({ data: { session } }) => {
      const isRecovery = hasRecoveryParams();
      if (session && !routedRef.current && !isRecovery) {
        routedRef.current = true;
        routeAfterAuth(session.user.id, navigate);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        const redirectPath = getRecoveryRedirectPath();
        if (redirectPath) {
          navigate(redirectPath, { replace: true });
        } else if (window.location.pathname !== "/reset-password") {
          navigate("/reset-password", { replace: true });
        }
        return;
      }

      if (event === "SIGNED_IN" && session && !routedRef.current) {
        if (isRecoveryRedirectInProgress()) return;
        routedRef.current = true;
        routeAfterAuth(session.user.id, navigate);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
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

      if (!rememberMe) sessionStorage.setItem("tempSession", "true");
      else sessionStorage.removeItem("tempSession");
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

  const handleSignup = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });
      if (error) throw error;
      toast.success("Account created! Check your email to verify.");
      // If session was returned (auto-confirm), the listener will route.
    } catch (error: any) {
      toast.error(error.message || "Sign-up failed. Please try again.");
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
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: getResetPasswordRedirectUrl(),
        },
      );
      if (error) throw error;
      toast.success("Password reset email sent! Check your inbox.");
      setIsForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const subtitle = isForgotPassword
    ? "Reset your password"
    : isLogin
      ? "Welcome back"
      : "Create your account";

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
            <img
              src="/pdfnest-logo.png"
              alt="PDFNest"
              className="w-full h-full object-contain"
            />
          </motion.div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              PDFNest
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-2">
              {subtitle}
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
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setIsLogin(true);
                  }}
                  className="text-sm text-primary hover:underline"
                  disabled={loading}
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={isLogin ? handleLogin : handleSignup}
              className="space-y-4"
            >
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
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </div>

              {isLogin && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberMe"
                      checked={rememberMe}
                      onCheckedChange={(checked) =>
                        setRememberMe(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="rememberMe"
                      className="text-sm text-muted-foreground leading-none cursor-pointer"
                    >
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
              )}

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </>
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          )}

          {!isForgotPassword && (
            <p className="text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setIsLogin((v) => !v)}
                className="text-primary hover:underline font-medium"
              >
                {isLogin ? "Sign up" : "Sign in"}
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
          <Link
            to="/terms"
            className="hover:text-foreground hover:underline transition-colors"
          >
            Terms &amp; Conditions
          </Link>
          <span className="mx-2">•</span>
          <Link
            to="/privacy"
            className="hover:text-foreground hover:underline transition-colors"
          >
            Privacy Policy
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
