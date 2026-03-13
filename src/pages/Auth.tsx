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
import { logActivity, startSession } from "@/lib/sessionLogger";

const GoogleIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
    <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.5-5.4 3.5-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.6 2.9 14.5 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6.9 0 9.2-4.8 9.2-7.3 0-.5-.1-.9-.1-1.3H12z"/>
    <path fill="#34A853" d="M2.8 11.2c0 1.7.6 3.2 1.7 4.5l2.8-2.2c-.4-.7-.6-1.4-.6-2.3s.2-1.6.6-2.3L4.5 6.7a8.8 8.8 0 0 0-1.7 4.5z"/>
    <path fill="#FBBC05" d="M12 20.4c2.5 0 4.6-.8 6.2-2.3l-3-2.4c-.8.6-1.8.9-3.2.9-2.5 0-4.7-1.7-5.5-4L3.6 15c1.6 3.2 4.9 5.4 8.4 5.4z"/>
    <path fill="#4285F4" d="M21.2 12.8c0-.6-.1-1.1-.2-1.6H12v3.9h5.4c-.3 1.3-1 2.3-2.1 3l3 2.4c1.8-1.6 2.9-4.1 2.9-7.7z"/>
  </svg>
);

const authSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

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
  const isOnboarding = useRef(false);
  const oauthProcessedRef = useRef(false);
  const redirectingRef = useRef(false);

  const isGoogleProviderDisabled = (message?: string) => /unsupported provider|provider is not enabled|missing oauth secret/i.test(message || "");

  const ensureGoogleProfile = async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) return;

    const googleDefaultsRaw = localStorage.getItem("pendingGoogleSignupDefaults");
    let googleDefaults: { nickname?: string; preferredTheme?: string } | null = null;
    if (googleDefaultsRaw) {
      try {
        googleDefaults = JSON.parse(googleDefaultsRaw);
      } catch {
        localStorage.removeItem("pendingGoogleSignupDefaults");
      }
    }

    const derivedNickname = googleDefaults?.nickname?.trim()
      || user.user_metadata?.nickname
      || user.user_metadata?.full_name
      || user.user_metadata?.name
      || user.email?.split("@")[0]
      || "User";

    const preferredTheme = googleDefaults?.preferredTheme || "system";

    const payload = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      display_name: derivedNickname,
      nickname: derivedNickname,
      preferred_theme: preferredTheme,
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (upsertError) throw upsertError;

    setTheme(preferredTheme);
    localStorage.setItem("pdfnest-theme", preferredTheme);
    localStorage.removeItem("pendingGoogleSignupDefaults");
  };

  useEffect(() => {
    localStorage.setItem("hasVisitedBefore", "true");

    const handleRedirect = async () => {
      if (isOnboarding.current || redirectingRef.current) return;

      redirectingRef.current = true;
      try {
        const { data: userData } = await supabase.auth.getUser();
        const provider = userData.user?.app_metadata?.provider;

        if (provider === "google" && !oauthProcessedRef.current) {
          oauthProcessedRef.current = true;
          try {
            await ensureGoogleProfile();
            toast.success("Signed in with Google successfully.");
          } catch (error: any) {
            toast.error(error.message || "Failed to initialize your Google profile.");
          }
        }

        const redirectPath = sessionStorage.getItem("redirectAfterLogin");
        if (redirectPath) {
          sessionStorage.removeItem("redirectAfterLogin");
          navigate(redirectPath);
        } else {
          navigate("/");
        }
      } finally {
        redirectingRef.current = false;
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isOnboarding.current) {
        void handleRedirect();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !isOnboarding.current) {
        void handleRedirect();
      }
    });

    const handleBeforeUnload = () => {
      if (sessionStorage.getItem("tempSession") === "true") {
        supabase.auth.signOut();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [navigate, setTheme]);

  const handleStartOnboarding = () => {
    isOnboarding.current = true;
  };

  const handleFinishOnboarding = () => {
    isOnboarding.current = false;
    navigate("/");
  };

  const clearOnboardingGuard = () => {
    isOnboarding.current = false;
  };

  const triggerGoogleOAuthSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
      await startSession();
      await logActivity("login_success", { provider: "google", flow: "oauth_redirect_started" });
      toast.success("Redirecting to Google...");
    } catch (error: any) {
      await logActivity("login_failed", { provider: "google", reason: error?.message || "oauth_error" });
      if (isGoogleProviderDisabled(error?.message)) {
        toast.error("Google sign-in is misconfigured in Supabase (provider disabled or missing OAuth secret). Update Google provider settings.");
      } else {
        toast.error(error.message || "Unable to continue with Google");
      }
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      authSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
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
      await startSession();
      await logActivity("login_success", { provider: "email_password", rememberMe });

      if (!rememberMe) {
        sessionStorage.setItem("tempSession", "true");
      } else {
        sessionStorage.removeItem("tempSession");
      }
      toast.success("Welcome back!");
    } catch (error: any) {
      await logActivity("login_failed", {
        provider: "email_password",
        identifier: email.trim().toLowerCase(),
        reason: error?.message || "unknown_error",
      });
      toast.error(error.message || "An error occurred");
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
        onAbortOnboarding={clearOnboardingGuard}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <div className="absolute inset-0 bg-gradient-to-tl from-primary/10 via-transparent to-accent/10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-secondary/5 to-transparent pointer-events-none" />

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
          <motion.div whileHover={{ scale: 1.05, rotate: 5 }} className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden">
            <img src="/pdfnest-logo.png" alt="PDFNest Logo" className="w-full h-full object-contain" />
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
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
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
            <form onSubmit={handleAuth} className="space-y-4">
              <Button type="button" variant="outline" className="w-full" onClick={triggerGoogleOAuthSignIn} disabled={loading}>
                <GoogleIcon />
                Continue with Google
              </Button>

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
                  <Checkbox id="rememberMe" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked as boolean)} />
                  <label htmlFor="rememberMe" className="text-sm text-muted-foreground leading-none cursor-pointer">
                    Remember me
                  </label>
                </div>
                <button type="button" onClick={() => setIsForgotPassword(true)} className="text-sm text-primary hover:underline" disabled={loading}>
                  Forgot password?
                </button>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Loading..." : "Sign In"}
              </Button>
            </form>
          )}

          {!isForgotPassword && (
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button type="button" onClick={() => setIsLogin(false)} className="text-primary hover:underline">
                Sign up
              </button>
            </p>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.4 }} className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground hover:underline transition-colors">
            Terms & Conditions
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
