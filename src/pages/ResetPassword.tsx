import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { z } from "zod";
import { AlertTriangle, KeyRound, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100)
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const RECOVERY_WAIT_MS = 2500;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const hasRecoveryParams = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash || "";

    return (
      searchParams.get("type") === "recovery" ||
      searchParams.has("code") ||
      hash.includes("type=recovery") ||
      hash.includes("access_token=") ||
      hash.includes("refresh_token=")
    );
  }, []);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: number | undefined;

    const markRecoveryReady = (
      session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]
    ) => {
      if (!isMounted || !session) return;

      setHasRecoverySession(true);
      setUserEmail(session.user?.email ?? null);
      setCheckingLink(false);

      if (window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    const markInvalid = () => {
      if (!isMounted) return;
      setHasRecoverySession(false);
      setCheckingLink(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION" ||
        event === "TOKEN_REFRESHED"
      ) {
        if (session) {
          markRecoveryReady(session);
        }
      }
    });

    const bootstrapRecovery = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        markRecoveryReady(session);
        return;
      }

      timeoutId = window.setTimeout(() => {
        markInvalid();
      }, hasRecoveryParams ? RECOVERY_WAIT_MS : 400);
    };

    bootstrapRecovery();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [hasRecoveryParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      resetPasswordSchema.parse({ password, confirmPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    if (!hasRecoverySession) {
      toast.error("This reset link is invalid or expired. Request a new one.");
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success("Password updated successfully.");

      await supabase.auth.signOut();
      navigate("/reset-password-success", { replace: true });
    } catch (error: any) {
      toast.error(error?.message || "Failed to update password. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 px-4 py-6 sm:px-6">
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="w-full"
        >
          <div className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-xl">
            <div className="bg-primary/[0.05] px-6 pb-6 pt-8 text-center sm:px-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-8 ring-primary/5">
                {checkingLink ? (
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                ) : hasRecoverySession ? (
                  <KeyRound className="h-7 w-7 text-primary" />
                ) : (
                  <AlertTriangle className="h-7 w-7 text-destructive" />
                )}
              </div>

              <div className="mt-5 space-y-2">
                <img
                  src="/pdfnest-logo.png"
                  alt="PDFNest Logo"
                  className="mx-auto h-10 w-10 rounded-xl object-contain"
                />
                <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
                  {checkingLink
                    ? "Checking reset link"
                    : hasRecoverySession
                      ? "Create a new password"
                      : "Reset link expired"}
                </h1>
                <p className="text-sm leading-6 text-muted-foreground sm:text-[15px]">
                  {checkingLink
                    ? "Hang tight. We’re verifying your password reset session."
                    : hasRecoverySession
                      ? `Set a strong new password${userEmail ? ` for ${userEmail}` : ""}. Once saved, this becomes the password for your account.`
                      : "This link is no longer valid. Request a fresh reset email and try again."}
                </p>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8">
              {checkingLink ? (
                <div className="space-y-3">
                  <div className="h-11 animate-pulse rounded-xl bg-muted/40" />
                  <div className="h-11 animate-pulse rounded-xl bg-muted/30" />
                  <div className="h-11 animate-pulse rounded-xl bg-muted/20" />
                </div>
              ) : hasRecoverySession ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <PasswordInput
                      id="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={submitting}
                    />
                    <PasswordStrengthIndicator password={password} show={password.length > 0} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <PasswordInput
                      id="confirmPassword"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] px-4 py-3">
                    <p className="text-sm leading-6 text-muted-foreground">
                      After you save this password, the old one stops working. You’ll be taken back to sign in with the new password.
                    </p>
                  </div>

                  <Button type="submit" className="h-11 w-full rounded-xl" disabled={submitting}>
                    {submitting ? "Updating Password..." : "Save New Password"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-3">
                  <Button
                    className="h-11 w-full rounded-xl"
                    onClick={() => navigate("/auth", { replace: true })}
                  >
                    Back to Login
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 w-full rounded-xl"
                    onClick={() => navigate("/auth", { replace: true, state: { forgotPassword: true } })}
                  >
                    Request New Reset Link
                  </Button>
                </div>
              )}
            </div>
          </div>

          {!checkingLink && hasRecoverySession && (
            <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
              For security, you’ll be signed out after the password is updated so you can log in cleanly with the new one.
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
