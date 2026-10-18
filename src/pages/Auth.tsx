import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { logActivity } from "@/lib/sessionLogger";
import {
  Loader2,
  Mail,
  Check,
  RotateCw,
  ExternalLink,
  ArrowLeft,
  Inbox,
  ShieldCheck,
} from "lucide-react";
import {
  getRecoveryRedirectPath,
  getResetPasswordRedirectUrl,
  hasRecoveryParams,
  isRecoveryRedirectInProgress,
} from "@/lib/authRecovery";

const signinSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(1, "Password is required").max(100),
});

const signupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must be under 100 characters"),
    email: z
      .string()
      .trim()
      .email("Invalid email address")
      .max(255),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
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
  const [isEmailVerificationSent, setIsEmailVerificationSent] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // State & Loading
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const routedRef = useRef(false);

  // Cooldown countdown effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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
    setFieldErrors({});

    const result = signinSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (field && !errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      toast.error(result.error.issues[0]?.message || "Invalid input");
      return;
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
    setFieldErrors({});

    const result = signupSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (field && !errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      toast.error(result.error.issues[0]?.message || "Please check the form");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: {
            full_name: fullName.trim(),
            display_name: fullName.trim(),
            name: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      if (data?.session) {
        toast.success("Account created successfully!");
      } else {
        setIsEmailVerificationSent(true);
        setResendCooldown(60);
        toast.success("Account created! Check your email to verify.");
      }
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

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || resending || !email.trim()) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });
      if (error) throw error;
      toast.success("Verification email resent! Check your inbox.");
      setResendCooldown(60);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend verification email");
    } finally {
      setResending(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin((prev) => !prev);
    setFieldErrors({});
    setConfirmPassword("");
  };

  const isGmail = email.trim().toLowerCase().endsWith("@gmail.com");
  const isOutlook =
    email.trim().toLowerCase().endsWith("@outlook.com") ||
    email.trim().toLowerCase().endsWith("@hotmail.com") ||
    email.trim().toLowerCase().endsWith("@live.com");

  const subtitle = isEmailVerificationSent
    ? "Check your inbox"
    : isForgotPassword
      ? "Reset your password"
      : isLogin
        ? "Welcome back"
        : "Create your student account";

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
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden shadow-sm"
          >
            <img
              src="/pdfnest-logo.png"
              alt="PDFNest"
              className="w-full h-full object-contain"
            />
          </motion.div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
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
          <AnimatePresence mode="wait">
            {isEmailVerificationSent ? (
              <motion.div
                key="verification-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6 text-center py-2"
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary relative">
                  <Mail className="w-8 h-8" />
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">
                    Verify your email address
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We sent an activation link to:
                  </p>
                  <p className="font-semibold text-foreground bg-muted/60 py-1.5 px-3 rounded-md text-sm inline-block break-all border border-border/40">
                    {email}
                  </p>
                  <p className="text-xs text-muted-foreground pt-1">
                    Click the link in the email to activate your account and start organizing course materials.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {isGmail && (
                    <Button asChild variant="outline" className="w-full h-10 gap-2 border-border">
                      <a
                        href="https://mail.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Inbox className="w-4 h-4 text-red-500" />
                        Open Gmail
                        <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-60" />
                      </a>
                    </Button>
                  )}

                  {isOutlook && (
                    <Button asChild variant="outline" className="w-full h-10 gap-2 border-border">
                      <a
                        href="https://outlook.live.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Inbox className="w-4 h-4 text-blue-500" />
                        Open Outlook
                        <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-60" />
                      </a>
                    </Button>
                  )}

                  <Button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendCooldown > 0 || resending}
                    className="w-full h-11"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Resending...
                      </>
                    ) : resendCooldown > 0 ? (
                      `Resend email in ${resendCooldown}s`
                    ) : (
                      <>
                        <RotateCw className="w-4 h-4 mr-2" />
                        Resend verification email
                      </>
                    )}
                  </Button>
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEmailVerificationSent(false);
                      setIsLogin(false);
                    }}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Edit email
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsEmailVerificationSent(false);
                      setIsLogin(true);
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Return to sign in
                  </button>
                </div>
              </motion.div>
            ) : isForgotPassword ? (
              <motion.form
                key="forgot-password-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleForgotPassword}
                className="space-y-4"
              >
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
                      setFieldErrors({});
                    }}
                    className="text-sm text-primary hover:underline"
                    disabled={loading}
                  >
                    Back to sign in
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="auth-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={isLogin ? handleLogin : handleSignup}
                className="space-y-4"
              >
                {/* Full name input for sign up */}
                {!isLogin && (
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="e.g. Alex Johnson"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (fieldErrors.fullName) {
                          setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                        }
                      }}
                      required
                      disabled={loading}
                      autoComplete="name"
                    />
                    {fieldErrors.fullName && (
                      <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-destructive">{fieldErrors.email}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                    required
                    disabled={loading}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                  {fieldErrors.password && (
                    <p className="text-xs text-destructive">{fieldErrors.password}</p>
                  )}

                  {/* Real-time Password Strength Indicator for sign up */}
                  {!isLogin && (
                    <PasswordStrengthIndicator
                      password={password}
                      show={Boolean(password)}
                    />
                  )}
                </div>

                {/* Confirm Password input for sign up */}
                {!isLogin && (
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <PasswordInput
                      id="confirmPassword"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (fieldErrors.confirmPassword) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            confirmPassword: undefined,
                          }));
                        }
                      }}
                      required
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    {fieldErrors.confirmPassword ? (
                      <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
                    ) : confirmPassword && confirmPassword === password ? (
                      <p className="text-xs text-green-500 flex items-center gap-1 font-medium">
                        <Check className="w-3.5 h-3.5" /> Passwords match
                      </p>
                    ) : null}
                  </div>
                )}

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
                      onClick={() => {
                        setIsForgotPassword(true);
                        setFieldErrors({});
                      }}
                      className="text-sm text-primary hover:underline"
                      disabled={loading}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full h-11 mt-2" disabled={loading}>
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
              </motion.form>
            )}
          </AnimatePresence>

          {!isForgotPassword && !isEmailVerificationSent && (
            <p className="text-center text-sm text-muted-foreground pt-1">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={toggleAuthMode}
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
