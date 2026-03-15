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
import { useTheme } from "next-themes";
import { startSession, logActivity } from "@/lib/sessionLogger";
import { Loader2 } from "lucide-react";

// ─── Google icon ─────────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
    <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.5-5.4 3.5-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.6 2.9 14.5 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6.9 0 9.2-4.8 9.2-7.3 0-.5-.1-.9-.1-1.3H12z"/>
    <path fill="#34A853" d="M2.8 11.2c0 1.7.6 3.2 1.7 4.5l2.8-2.2c-.4-.7-.6-1.4-.6-2.3s.2-1.6.6-2.3L4.5 6.7a8.8 8.8 0 0 0-1.7 4.5z"/>
    <path fill="#FBBC05" d="M12 20.4c2.5 0 4.6-.8 6.2-2.3l-3-2.4c-.8.6-1.8.9-3.2.9-2.5 0-4.7-1.7-5.5-4L3.6 15c1.6 3.2 4.9 5.4 8.4 5.4z"/>
    <path fill="#4285F4" d="M21.2 12.8c0-.6-.1-1.1-.2-1.6H12v3.9h5.4c-.3 1.3-1 2.3-2.1 3l3 2.4c1.8-1.6 2.9-4.1 2.9-7.7z"/>
  </svg>
);

// ─── Validation ───────────────────────────────────────────────────────────────

const authSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns true if the error looks like Google provider isn't configured */
const isProviderDisabled = (msg?: string) =>
  /unsupported provider|provider is not enabled|missing oauth secret/i.test(msg ?? "");

/**
 * After a successful Google OAuth redirect, ensure the user's profile row
 * is fully populated.  The DB trigger (handle_new_user) does this on first
 * sign-in, but we upsert here too so returning Google users always have
 * up-to-date display_name / avatar_url / terms_accepted.
 */
async function ensureGoogleProfile(setTheme: (t: string) => void) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Pick up any theme / nickname stored before the OAuth redirect
  let pendingDefaults: { nickname?: string; preferredTheme?: string } | null = null;
  try {
    const raw = localStorage.getItem("pendingGoogleSignupDefaults");
    if (raw) pendingDefaults = JSON.parse(raw);
  } catch { /* ignore */ }

  const meta = user.user_metadata ?? {};
  const displayName =
    pendingDefaults?.nickname?.trim() ||
    meta.nickname ||
    meta.full_name ||
    meta.name ||
    user.email?.split("@")[0] ||
    "User";

  const preferredTheme = pendingDefaults?.preferredTheme || "system";

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: meta.full_name || meta.name || null,
      display_name: displayName,
      avatar_url: meta.avatar_url || meta.picture || null,
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
      preferred_theme: preferredTheme,
    },
    { onConflict: "id" }
  );

  if (error) throw error;

  setTheme(preferredTheme);
  localStorage.setItem("pdfnest-theme", preferredTheme);
  localStorage.removeItem("pendingGoogleSignupDefaults");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Auth() {
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  const isFirstTimeVisitor = !localStorage.getItem("hasVisitedBefore");
  const [isLogin, setIsLogin] = useState(!isFirstTimeVisitor);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // Guards to prevent duplicate navigation
  const isOnboarding = useRef(false);
  const didRedirect = useRef(false);

  // ── Post-OAuth redirect handler ─────────────────────────────────────────────
  // Called once after Google sends the user back to /auth.
  // onAuthStateChange fires with event=SIGNED_IN when tokens are exchanged.
  const handlePostOAuthRedirect = async () => {
    if (didRedirect.current) return;
    didRedirect.current = true;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const provider = user.app_metadata?.provider;
      if (provider === "google") {
        try {
          await ensureGoogleProfile(setTheme);
          toast.success("Signed in with Google!");
        } catch (err: any) {
          // Profile upsert failed — log but don't block navigation
          console.error("ensureGoogleProfile error:", err);
        }
      }

      // Log session start (non-blocking)
      startSession().catch(() => {});
      logActivity("login_success", { provider }).catch(() => {});

      // Navigate to intended destination or dashboard
      const redirectTo = sessionStorage.getItem("redirectAfterLogin");
      if (redirectTo) {
        sessionStorage.removeItem("redirectAfterLogin");
        navigate(redirectTo, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      console.error("handlePostOAuthRedirect error:", err);
      didRedirect.current = false; // allow retry
    }
  };

  useEffect(() => {
    // Mark that the user has visited so returning users go to login not signup
    localStorage.setItem("hasVisitedBefore", "true");

    // If the page loaded because of an OAuth callback, Supabase will have
    // already parsed the fragment tokens and fired SIGNED_IN.
    // Check for an existing session first (covers the PKCE / implicit flow).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isOnboarding.current) {
        void handlePostOAuthRedirect();
      }
    });

    // Also listen for auth state changes during this page's lifetime
    // (covers the case where tokens arrive slightly after mount)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session && !isOnboarding.current) {
        void handlePostOAuthRedirect();
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Signup wizard callbacks ──────────────────────────────────────────────────
  const handleStartOnboarding = () => { isOnboarding.current = true; };
  const handleFinishOnboarding = () => { isOnboarding.current = false; navigate("/dashboard"); };
  const handleAbortOnboarding = () => { isOnboarding.current = false; };

  // ── Google sign-in ───────────────────────────────────────────────────────────
  // Triggers the standard Supabase OAuth redirect flow.
  // Google authenticates the user and redirects back to /auth.
  // onAuthStateChange then fires SIGNED_IN → handlePostOAuthRedirect.
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
      if (error) throw error;
      // Browser will redirect to Google — nothing more to do here
    } catch (error: any) {
      if (isProviderDisabled(error?.message)) {
        toast.error(
          "Google sign-in is not configured. Enable the Google provider in your Supabase dashboard."
        );
      } else {
        toast.error(error.message || "Could not start Google sign-in.");
      }
      setLoading(false);
    }
  };

  // ── Email / password sign-in ─────────────────────────────────────────────────
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
      // onAuthStateChange → handlePostOAuthRedirect will navigate
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

  // ── Forgot password ──────────────────────────────────────────────────────────
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

  // ── Signup wizard ────────────────────────────────────────────────────────────
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

  // ── Login / forgot-password form ─────────────────────────────────────────────
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
        {/* Logo + title */}
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

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-card/80 backdrop-blur-sm rounded-xl shadow-lg p-6 md:p-8 border border-border/50 space-y-6"
        >
          {/* ── Forgot password form ── */}
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
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
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : "Send Reset Link"}
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
            /* ── Sign-in form ── */
            <form onSubmit={handleAuth} className="space-y-4">

              {/* Google button */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 gap-3 font-medium"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or use email</span>
                </div>
              </div>

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
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : "Sign In"}
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
