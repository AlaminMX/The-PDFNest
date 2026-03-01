import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Confetti } from "@/components/Confetti";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StepAccountBasics } from "./StepAccountBasics";
import { StepDiscoverySource } from "./StepDiscoverySource";
import { StepUserType } from "./StepUserType";
import { StepPreferences } from "./StepPreferences";
import { StepGuidedUpload } from "./StepGuidedUpload";

export interface SignupData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
  discoverySource: string;
  discoverySourceOther: string;
  isStudent: boolean | null;
  school: string;
  schoolOther: string;
  departmentId: string;
  preferredTheme: string;
  usageReason: string;
  usageReasonOther: string;
  age: string;
  nickname: string;
}

const initialData: SignupData = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
  discoverySource: "",
  discoverySourceOther: "",
  isStudent: null,
  school: "",
  schoolOther: "",
  departmentId: "",
  preferredTheme: "system",
  usageReason: "",
  usageReasonOther: "",
  age: "",
  nickname: "",
};

interface SignupWizardProps {
  onSwitchToLogin: () => void;
  onStartOnboarding: () => void;
  onFinishOnboarding: () => void;
  onAbortOnboarding: () => void;
}

export function SignupWizard({ onSwitchToLogin, onStartOnboarding, onFinishOnboarding, onAbortOnboarding }: SignupWizardProps) {
  const { setTheme } = useTheme();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SignupData>(initialData);
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [direction, setDirection] = useState(1);
  const submittingRef = useRef(false);

  const totalSteps = 5;

  const updateData = (partial: Partial<SignupData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const goBack = () => {
    if (loading) return;
    setDirection(-1);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const getResolvedProfileData = () => {
    const discoverySource = data.discoverySource === "other"
      ? data.discoverySourceOther
      : data.discoverySource;

    const usageReason = data.usageReason === "other"
      ? data.usageReasonOther
      : data.usageReason;

    const school = data.school === "others"
      ? data.schoolOther
      : data.school;

    const nickname = data.nickname?.trim() || data.fullName.trim() || data.email.split("@")[0];

    const profilePayload: Record<string, unknown> = {
      email: data.email.trim(),
      full_name: data.fullName.trim() || null,
      display_name: nickname,
      nickname,
      discovery_source: discoverySource || null,
      is_student: data.isStudent ?? false,
      school: school || null,
      preferred_theme: data.preferredTheme || "system",
      usage_reason: usageReason || null,
      terms_accepted: data.termsAccepted,
      terms_accepted_at: data.termsAccepted ? new Date().toISOString() : null,
    };

    if (data.age && !Number.isNaN(Number.parseInt(data.age, 10))) {
      profilePayload.age = Number.parseInt(data.age, 10);
    }

    if (data.departmentId) {
      profilePayload.department_id = data.departmentId;
    }

    return profilePayload;
  };

  const applyThemePreference = () => {
    const preferredTheme = data.preferredTheme || "system";
    setTheme(preferredTheme);
    localStorage.setItem("pdfnest-theme", preferredTheme);
  };

  const isGoogleProviderDisabled = (message?: string) => /unsupported provider|provider is not enabled|missing oauth secret/i.test(message || "");

  const upsertProfile = async (userId: string) => {
    const profilePayload = getResolvedProfileData();
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, ...profilePayload }, { onConflict: "id" });

    if (error) throw error;
  };

  const handleGoogleSignup = async () => {
    if (loading) return;

    setLoading(true);
    try {
      localStorage.setItem("pendingGoogleSignupDefaults", JSON.stringify({
        nickname: data.nickname?.trim() || data.fullName.trim() || "",
        preferredTheme: data.preferredTheme || "system",
      }));

      const { lovable } = await import("@/integrations/lovable/index");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result?.error) throw result.error;
      toast.success("Redirecting to Google...");
    } catch (error: any) {
      if (isGoogleProviderDisabled(error?.message)) {
        toast.error("Google sign-in is not available at the moment. Please try again later.");
      } else {
        toast.error(error.message || "Unable to continue with Google");
      }
      setLoading(false);
    }
  };

  const handleStepComplete = (nextStep: number) => {
    if (loading) return;
    setDirection(1);
    setStep(nextStep);
  };

  const handleFinish = async () => {
    if (submittingRef.current || loading) return;

    submittingRef.current = true;
    setLoading(true);
    try {
      onStartOnboarding();

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: data.fullName.trim(),
            nickname: data.nickname?.trim() || null,
          },
        },
      });

      let user = signUpData.user;
      const alreadyRegistered = signUpError?.message?.toLowerCase().includes("already") || false;

      if (signUpError && !alreadyRegistered) {
        throw signUpError;
      }

      if (!user && alreadyRegistered) {
        const { data: signedInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email.trim(),
          password: data.password,
        });

        if (signInError) {
          throw new Error("This email already exists. Sign in to continue your existing account.");
        }

        user = signedInData.user;
        toast.info("Existing account detected. We completed the remaining signup details.");
      }

      if (!user) {
        throw new Error("Could not create account session. Please try again.");
      }

      await upsertProfile(user.id);
      applyThemePreference();

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
      setSignupComplete(true);
      toast.success("Signup complete. Welcome to PDFNest!");
      onFinishOnboarding();
    } catch (error: any) {
      onAbortOnboarding();
      toast.error(error.message || "An error occurred while finishing signup");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {showConfetti && <Confetti />}

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] bg-gradient-to-tr from-accent/30 to-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <img src="/pdfnest-logo.png" alt="PDFNest" className="w-8 h-8 rounded-lg" />
          <span className="font-semibold text-foreground text-lg">PDFNest</span>
        </div>
        <ThemeToggle />
      </div>

      {step <= totalSteps && !signupComplete && (
        <div className="relative z-10 px-6 md:px-0 md:max-w-lg md:mx-auto w-full">
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  i < step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Step {step} of {totalSteps}
          </p>
        </div>
      )}

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {step === 1 && (
                <StepAccountBasics
                  data={data}
                  updateData={updateData}
                  onNext={() => handleStepComplete(2)}
                  onGoogleSignup={handleGoogleSignup}
                  onSwitchToLogin={onSwitchToLogin}
                  loading={loading}
                />
              )}
              {step === 2 && (
                <StepDiscoverySource
                  data={data}
                  updateData={updateData}
                  onNext={() => handleStepComplete(3)}
                  onBack={goBack}
                />
              )}
              {step === 3 && (
                <StepUserType
                  data={data}
                  updateData={updateData}
                  onNext={() => handleStepComplete(4)}
                  onBack={goBack}
                />
              )}
              {step === 4 && (
                <StepPreferences
                  data={data}
                  updateData={updateData}
                  onNext={() => handleStepComplete(5)}
                  onBack={goBack}
                />
              )}
              {step === 5 && (
                <StepGuidedUpload
                  onFinish={handleFinish}
                  onBack={goBack}
                  signupComplete={signupComplete}
                  loading={loading}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
