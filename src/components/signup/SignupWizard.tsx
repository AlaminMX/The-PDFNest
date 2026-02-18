import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  onStartOnboarding: () => void;
  onFinishOnboarding: () => void;
}

export function SignupWizard({ onSwitchToLogin, onStartOnboarding, onFinishOnboarding }: SignupWizardProps) {
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

  const goBack = () => {
    setDirection(-1);
    setStep(prev => Math.max(prev - 1, 1));
  };

    const handleAccountCreate = async () => {
      // Just validate locally
      if (!data.email || !data.password) {
        toast.error("Please fill in all required fields.");
        return;
      }
    
      if (data.password !== data.confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
    
      if (!data.termsAccepted) {
        toast.error("You must accept the terms.");
        return;
      }
    
      setDirection(1);
      setStep(2);
    };
  
      // Update profile with terms
      // const { data: authData } = await supabase.auth.getUser();
      // if (authData?.user) {
      //   await supabase.from("profiles").update({
      //     terms_accepted: true,
      //     terms_accepted_at: new Date().toISOString(),
      //   }).eq("id", authData.user.id);
      // }

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
      toast.success("Account created! Let's personalize your experience.");
      
      // Move to step 2
      setDirection(1);
      setStep(2);
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
    if (step >= 2) {
      await saveProfileData();
    }
    setDirection(1);
    setStep(nextStep);
  };

  const handleFinish = async () => {
  setLoading(true);
  try {
    onStartOnboarding();

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

    // Save extra profile data AFTER signup
    await saveProfileData();

    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);

    setSignupComplete(true);
    onFinishOnboarding();
  } catch (error: any) {
    toast.error(error.message || "Signup failed");
  } finally {
    setLoading(false);
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
      
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] bg-gradient-to-tr from-accent/30 to-primary/10 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <img src="/pdfnest-logo.png" alt="PDFNest" className="w-8 h-8 rounded-lg" />
          <span className="font-semibold text-foreground text-lg">PDFNest</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Progress bar */}
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

      {/* Main content area - centered */}
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
      </div>
    </div>
  );
}
