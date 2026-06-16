import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Faculty {
  id: string;
  name: string;
}
interface Department {
  id: string;
  name: string;
  faculty_id: string | null;
}

const LEVELS = [100, 200, 300, 400, 500];

export default function Onboarding() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isStudent, setIsStudent] = useState<boolean | null>(null);
  const [nickname, setNickname] = useState("");
  const [showComplete, setShowComplete] = useState(false);
  const [facultyId, setFacultyId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Guard: must be authenticated, and skip if already complete
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }
      setUserId(session.user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", session.user.id)
        .maybeSingle();
      if (profile?.onboarding_complete) {
        navigate("/dashboard", { replace: true });
        return;
      }
      // Load faculties
      const { data: facs } = await supabase
        .from("faculties")
        .select("id, name")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });
      setFaculties(facs || []);
      setLoading(false);
    })();
  }, [navigate]);

  // Load departments when faculty chosen
  useEffect(() => {
    if (!facultyId) return;
    (async () => {
      const { data } = await supabase
        .from("departments")
        .select("id, name, faculty_id")
        .eq("is_visible", true)
        .eq("faculty_id", facultyId)
        .order("display_order", { ascending: true });
      setDepartments(data || []);
    })();
  }, [facultyId]);

  const finish = async (skip = false) => {
    if (!userId) return;
    setSaving(true);
    try {
      const update: Record<string, any> = {
        onboarding_complete: true,
        is_student: isStudent === true,
        nickname: nickname.trim() || null,
        display_name: nickname.trim() || null,
      };
      if (!skip && isStudent) {
        update.faculty_id = facultyId;
        update.department_id = departmentId;
        update.level = level;
      } else {
        update.faculty_id = null;
        update.department_id = null;
        update.level = null;
      }
      const { error } = await supabase
        .from("profiles")
        .update(update)
        .eq("id", userId);
      if (error) throw error;
      setShowComplete(true);
    } catch (e: any) {
      toast.error(e.message || "Could not save preferences");
      setSaving(false);
    }
  };

  const next = () => setStep((s) => s + 1);
  const goDashboard = () => navigate("/dashboard", { replace: true });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const stepLabel = String(step).padStart(2, "0");
  const totalSteps = isStudent === false ? 2 : 5;
  const progress = (step / totalSteps) * 100;

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] text-white relative overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-white/10 z-50">
        <motion.div
          className="h-full bg-white"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Step counter */}
      <div className="fixed top-4 right-5 text-[11px] font-mono text-white/50 tracking-widest z-50">
        {stepLabel} / {String(totalSteps).padStart(2, "0")}
      </div>

      <main className="min-h-screen flex flex-col items-center justify-center px-5 py-16 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md mx-auto"
            >
              <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-center mb-2">
                Are you a student?
              </h1>
              <p className="text-sm text-white/40 text-center mb-10">
                Student accounts can select school details and contribute
                materials.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Yes, I am", value: true },
                  { label: "No", value: false },
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setIsStudent(option.value)}
                    className={`p-5 rounded-xl border transition-all duration-150 ${
                      isStudent === option.value
                        ? "border-white bg-white/5"
                        : "border-white/10 hover:border-white/30 bg-white/[0.02]"
                    }`}
                  >
                    <p className="text-sm font-medium">{option.label}</p>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <button
                  onClick={next}
                  disabled={isStudent === null}
                  className="px-6 py-2.5 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md mx-auto"
            >
              <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-center mb-2">
                Choose a username
              </h1>
              <p className="text-sm text-white/40 text-center mb-8">
                This nickname will appear on your profile.
              </p>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Username / nickname"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/40"
              />
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-white/40 hover:text-white/70 transition"
                >
                  Back
                </button>
                <button
                  onClick={() => (isStudent ? setStep(3) : finish(true))}
                  disabled={!nickname.trim() || saving}
                  className="px-6 py-2.5 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition inline-flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isStudent ? "Continue" : "Finish"}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-center mb-2">
                Select your faculty
              </h1>
              <p className="text-sm text-white/40 text-center mb-10">
                Tell us where you study.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {faculties.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFacultyId(f.id)}
                    className={`text-left p-5 rounded-xl border transition-all duration-150 ${facultyId === f.id ? "border-white bg-white/5" : "border-white/10 hover:border-white/30 bg-white/[0.02]"}`}
                  >
                    <p className="text-sm font-medium">{f.name}</p>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="text-sm text-white/40 hover:text-white/70 transition"
                >
                  Back
                </button>
                <button
                  onClick={next}
                  disabled={!facultyId}
                  className="px-6 py-2.5 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md mx-auto"
            >
              <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-center mb-2">
                Select your department
              </h1>
              <p className="text-sm text-white/40 text-center mb-10">
                Pick the one closest to your programme.
              </p>
              <div className="space-y-2">
                {departments.length === 0 && (
                  <p className="text-center text-sm text-white/40 py-6">
                    No departments listed for this faculty yet.
                  </p>
                )}
                {departments.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDepartmentId(d.id)}
                    className={`w-full flex items-center gap-3 text-left p-4 rounded-xl border transition-all duration-150 ${
                      departmentId === d.id
                        ? "border-white bg-white/5"
                        : "border-white/10 hover:border-white/30 bg-white/[0.02]"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 ${
                        departmentId === d.id
                          ? "border-white bg-white"
                          : "border-white/30"
                      }`}
                    />
                    <span className="text-sm">{d.name}</span>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="text-sm text-white/40 hover:text-white/70 transition"
                >
                  Back
                </button>
                <button
                  onClick={next}
                  disabled={!departmentId}
                  className="px-6 py-2.5 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-center mb-2">
                Select your level
              </h1>
              <p className="text-sm text-white/40 text-center mb-10">
                You can change this later from your profile.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    onClick={() => setLevel(lv)}
                    className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl border text-lg font-medium transition-all duration-150 ${
                      level === lv
                        ? "border-white bg-white/10 text-white"
                        : "border-white/10 hover:border-white/30 bg-white/[0.02] text-white/70"
                    }`}
                  >
                    {lv}
                  </button>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setStep(4)}
                  className="text-sm text-white/40 hover:text-white/70 transition"
                >
                  Back
                </button>
                <button
                  onClick={() => finish(false)}
                  disabled={!level || saving}
                  className="px-6 py-2.5 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition inline-flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Finish
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip link */}
        <button
          onClick={() => finish(true)}
          disabled={saving}
          className="mt-12 text-xs text-white/30 hover:text-white/60 transition"
        >
          Skip for now
        </button>
      </main>

      {showComplete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111] p-6 text-center shadow-2xl">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-400" />
            <h2 className="mt-4 text-xl font-semibold">Welcome to PDFNest!</h2>
            <p className="mt-2 text-sm text-white/50">
              Congratulations, your sign-up is complete.
            </p>
            <button
              onClick={goDashboard}
              className="mt-6 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-white/90"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
