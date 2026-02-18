import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Confetti } from "@/components/Confetti";
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
  financialLiteracyInterest: boolean;
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
  financialLiteracyInterest: false,
  usageReason: "",
  usageReasonOther: "",
  age: "",
  nickname: "",
};

interface SignupWizardProps {
  onSwitchToLogin: () => void;
}

export function SignupWizard({ onSwitchToLogin }: SignupWizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SignupData>(initialData);
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [direction, setDirection] = useState(1);

  const totalSteps = 5;

  const updateData = (partial: Partial<SignupData>) => {
    setData(prev => ({ ...prev, ...partial }));
  };

  const goNext = () => {
    setDirection(1);
    setStep(prev => Math.min(prev + 1, totalSteps));
  };

  const goBack = () => {
    setDirection(-1);
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleAccountCreate = async () => {
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: data.fullName.trim() },
        },
      });

      if (error) throw error;

      // Update profile with terms
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        await supabase.from("profiles").update({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
        }).eq("id", authData.user.id);
      }

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
      toast.success("Account created! Please check your email to verify.");
      goNext(); // Move to step 2
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const saveProfileData = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      const discoverySource = data.discoverySource === "other" 
        ? data.discoverySourceOther 
        : data.discoverySource;

      const usageReason = data.usageReason === "other"
        ? data.usageReasonOther
        : data.usageReason;

      const school = data.school === "others"
        ? data.schoolOther
        : data.school;

      const profileUpdate: Record<string, any> = {
        discovery_source: discoverySource || null,
        is_student: data.isStudent ?? false,
        school: school || null,
        preferred_theme: data.preferredTheme || "system",
        financial_literacy_interest: data.financialLiteracyInterest,
        usage_reason: usageReason || null,
        nickname: data.nickname?.trim() || null,
      };

      if (data.age && !isNaN(parseInt(data.age))) {
        profileUpdate.age = parseInt(data.age);
      }

      if (data.departmentId) {
        profileUpdate.department_id = data.departmentId;
      }

      await supabase.from("profiles").update(profileUpdate).eq("id", authData.user.id);
    } catch (err) {
      console.error("Failed to save profile data:", err);
    }
  };

  const handleStepComplete = async (nextStep: number) => {
    // Save profile data at the end of each onboarding step
    if (step >= 2) {
      await saveProfileData();
    }
    setDirection(1);
    setStep(nextStep);
  };

  const handleFinish = async () => {
    await saveProfileData();
    setSignupComplete(true);
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="w-full max-w-md relative z-10">
      {showConfetti && <Confetti />}

      {/* Progress indicator */}
      {step <= totalSteps && !signupComplete && (
        <div className="flex gap-1.5 mb-6 px-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i < step
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      )}

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
              onNext={handleAccountCreate}
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
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
