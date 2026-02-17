import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Confetti } from "@/components/Confetti";
import { toast } from "sonner";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useDepartments } from "@/hooks/useDepartments";
import { useDepartmentCategories } from "@/hooks/useDepartmentCategories";
import { ArrowLeft, ArrowRight, Upload, Check, X, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";

const TOTAL_STEPS = 5;

const DISCOVERY_OPTIONS = [
  "WhatsApp group",
  "Instagram",
  "A friend",
  "Lecturer/Teacher",
  "Google",
  "Other",
];

const USAGE_OPTIONS = [
  "Escape stress from too many PDFs",
  "Safe storage",
  "AFIT PDFs",
  "Research",
  "Other",
];

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(255),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^a-zA-Z0-9]/, "Must contain a special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface SignupWizardProps {
  onSwitchToLogin: () => void;
}

export function SignupWizard({ onSwitchToLogin }: SignupWizardProps) {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Step 2
  const [discoverySource, setDiscoverySource] = useState("");
  const [discoveryOther, setDiscoveryOther] = useState("");

  // Step 3
  const [isStudent, setIsStudent] = useState<string>(""); // "yes" | "no"
  const [schoolChoice, setSchoolChoice] = useState("");
  const [otherSchool, setOtherSchool] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Step 4
  const [preferredTheme, setPreferredTheme] = useState("system");
  const [financialInterest, setFinancialInterest] = useState<string>(""); // "yes" | "no"
  const [usageReason, setUsageReason] = useState("");
  const [usageOther, setUsageOther] = useState("");
  const [age, setAge] = useState("");
  const [nickname, setNickname] = useState("");

  // Step 5
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { departments, loading: loadingDepts } = useDepartments({ visibleOnly: true });
  const { categories: deptCategories, loading: loadingCats } = useDepartmentCategories();

  const filteredDepartments = selectedCategory && selectedCategory !== "all"
    ? departments.filter(dept => (dept as any).category_id === selectedCategory)
    : departments;

  const canProceed = useCallback(() => {
    switch (step) {
      case 1:
        return fullName.trim().length >= 2 && email.includes("@") && password.length >= 8 && password === confirmPassword && termsAccepted;
      case 2:
        return !!discoverySource && (discoverySource !== "Other" || discoveryOther.trim().length > 0);
      case 3:
        return !!isStudent;
      case 4:
        return true; // All optional
      case 5:
        return true; // Can skip
      default:
        return false;
    }
  }, [step, fullName, email, password, confirmPassword, termsAccepted, discoverySource, discoveryOther, isStudent]);

  const handleCreateAccount = async () => {
    // Validate step 1
    try {
      signUpSchema.parse({ fullName, email, password, confirmPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error, data } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: fullName.trim() },
        },
      });
      if (error) throw error;

      // Update profile with all collected data
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const finalDiscovery = discoverySource === "Other" ? discoveryOther.trim() : discoverySource;
        const finalSchool = schoolChoice === "Others" ? otherSchool.trim() : schoolChoice;
        const finalUsage = usageReason === "Other" ? usageOther.trim() : usageReason;

        const profileUpdate: Record<string, any> = {
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          discovery_source: finalDiscovery || null,
          is_student: isStudent === "yes",
          school: finalSchool || null,
          preferred_theme: preferredTheme,
          financial_literacy_interest: financialInterest === "yes",
          usage_reason: finalUsage || null,
          age: age ? parseInt(age, 10) : null,
          nickname: nickname.trim() || null,
        };

        if (selectedDepartment) {
          profileUpdate.department_id = selectedDepartment;
        }

        await supabase.from("profiles").update(profileUpdate).eq("id", user.id);

        // Apply theme preference
        if (preferredTheme !== "system") {
          setTheme(preferredTheme);
        }
      }

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
      setSignupComplete(true);
      toast.success("Account created! Please check your email to verify.");
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      // Create account on step 1 completion
      await handleCreateAccount();
      if (!signupComplete) return; // Account creation failed
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1 && !signupComplete) setStep(step - 1);
  };

  const handleFileUpload = async () => {
    if (!uploadedFile) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const storagePath = `${user.id}/${Date.now()}_${uploadedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("pdfs")
        .upload(storagePath, uploadedFile);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("pdf_files").insert({
        user_id: user.id,
        name: uploadedFile.name.replace(".pdf", ""),
        file_name: uploadedFile.name,
        storage_path: storagePath,
        file_size: uploadedFile.size,
      });
      if (dbError) throw dbError;

      await supabase.rpc("update_user_storage", { p_user_id: user.id, p_size_delta: uploadedFile.size });
      toast.success("PDF uploaded successfully!");
      setUploadedFile(null);
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") setUploadedFile(file);
    else toast.error("Only PDF files are accepted");
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction > 0 ? -80 : 80, opacity: 0 }),
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="new-password" />
              <PasswordStrengthIndicator password={password} show={password.length > 0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <PasswordInput id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required autoComplete="new-password" />
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked as boolean)} />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                I accept the{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms & Conditions</Link>
                {" "}and{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </label>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">How did you hear about PDFNest?</h3>
              <p className="text-sm text-muted-foreground">This helps us improve our reach</p>
            </div>
            <RadioGroup value={discoverySource} onValueChange={setDiscoverySource} className="space-y-2">
              {DISCOVERY_OPTIONS.map((option) => (
                <div key={option} className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value={option} id={`disc-${option}`} />
                  <Label htmlFor={`disc-${option}`} className="cursor-pointer flex-1">{option}</Label>
                </div>
              ))}
            </RadioGroup>
            {discoverySource === "Other" && (
              <Input value={discoveryOther} onChange={(e) => setDiscoveryOther(e.target.value)} placeholder="Please specify..." className="mt-2" autoFocus />
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Are you a student?</h3>
              <p className="text-sm text-muted-foreground">This personalizes your experience</p>
            </div>
            <RadioGroup value={isStudent} onValueChange={setIsStudent} className="space-y-2">
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors cursor-pointer">
                <RadioGroupItem value="yes" id="student-yes" />
                <Label htmlFor="student-yes" className="cursor-pointer flex-1">Yes</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors cursor-pointer">
                <RadioGroupItem value="no" id="student-no" />
                <Label htmlFor="student-no" className="cursor-pointer flex-1">No</Label>
              </div>
            </RadioGroup>

            {isStudent === "yes" && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>School</Label>
                  <RadioGroup value={schoolChoice} onValueChange={setSchoolChoice} className="space-y-2">
                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="AFIT" id="school-afit" />
                      <Label htmlFor="school-afit" className="cursor-pointer flex-1">AFIT</Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="Others" id="school-others" />
                      <Label htmlFor="school-others" className="cursor-pointer flex-1">Others</Label>
                    </div>
                  </RadioGroup>
                  {schoolChoice === "Others" && (
                    <Input value={otherSchool} onChange={(e) => setOtherSchool(e.target.value)} placeholder="Enter your school name" className="mt-2" autoFocus />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Category <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingCats ? "Loading..." : "All categories"} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">All categories</SelectItem>
                      {deptCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Department <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingDepts ? "Loading..." : "Select department"} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {filteredDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.icon && <span className="mr-2">{dept.icon}</span>}
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Your Preferences</h3>
              <p className="text-sm text-muted-foreground">All fields are optional</p>
            </div>

            <div className="space-y-2">
              <Label>Preferred Theme</Label>
              <RadioGroup value={preferredTheme} onValueChange={setPreferredTheme} className="flex gap-3">
                {[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "system", label: "System" },
                ].map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2 p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors cursor-pointer flex-1">
                    <RadioGroupItem value={opt.value} id={`theme-${opt.value}`} />
                    <Label htmlFor={`theme-${opt.value}`} className="cursor-pointer text-sm">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Interested in financial literacy?</Label>
              <RadioGroup value={financialInterest} onValueChange={setFinancialInterest} className="flex gap-3">
                <div className="flex items-center space-x-2 p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors cursor-pointer flex-1">
                  <RadioGroupItem value="yes" id="fin-yes" />
                  <Label htmlFor="fin-yes" className="cursor-pointer text-sm">Yes</Label>
                </div>
                <div className="flex items-center space-x-2 p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors cursor-pointer flex-1">
                  <RadioGroupItem value="no" id="fin-no" />
                  <Label htmlFor="fin-no" className="cursor-pointer text-sm">No</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Why are you using PDFNest?</Label>
              <RadioGroup value={usageReason} onValueChange={setUsageReason} className="space-y-2">
                {USAGE_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-3 p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={option} id={`usage-${option}`} />
                    <Label htmlFor={`usage-${option}`} className="cursor-pointer flex-1 text-sm">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
              {usageReason === "Other" && (
                <Input value={usageOther} onChange={(e) => setUsageOther(e.target.value)} placeholder="Please specify..." className="mt-2" autoFocus />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" min={13} max={100} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname</Label>
                <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Study name" />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 text-center">
            {!signupComplete ? (
              <>
                <Sparkles className="w-12 h-12 text-primary mx-auto" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Welcome to PDFNest!</h3>
                  <p className="text-sm text-muted-foreground">Your account has been created. Upload your first PDF to get started!</p>
                </div>
              </>
            ) : (
              <>
                <Check className="w-12 h-12 text-primary mx-auto" />
                <div>
                  <h3 className="text-xl font-bold mb-2">You're all set!</h3>
                  <p className="text-sm text-muted-foreground">Check your email to verify your account, then start organizing your PDFs.</p>
                </div>
              </>
            )}

            {/* Drag and drop upload */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40"}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {uploadedFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium truncate max-w-[200px]">{uploadedFile.name}</span>
                    <button onClick={() => setUploadedFile(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <Button onClick={handleFileUpload} disabled={uploading} className="gap-2">
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading..." : "Upload PDF"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                  <div>
                    <p className="text-sm font-medium">Drag & drop a PDF here</p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    id="first-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file?.type === "application/pdf") setUploadedFile(file);
                      else if (file) toast.error("Only PDF files are accepted");
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById("first-upload")?.click()}>
                    Browse Files
                  </Button>
                </div>
              )}
            </div>

            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => navigate("/")}>
              Skip for now →
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {showConfetti && <Confetti />}

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i + 1 === step ? "w-8 bg-primary" : i + 1 < step ? "w-4 bg-primary/40" : "w-4 bg-border"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait" custom={1}>
        <motion.div
          key={step}
          custom={1}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {step < 5 && (
        <div className="flex items-center justify-between pt-2">
          {step > 1 && !signupComplete ? (
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          ) : step === 1 ? (
            <Button variant="ghost" size="sm" onClick={onSwitchToLogin} className="text-muted-foreground">
              Already have an account?
            </Button>
          ) : (
            <div />
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className="gap-1"
          >
            {loading ? "Creating..." : step === 1 ? "Create Account" : "Next"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
