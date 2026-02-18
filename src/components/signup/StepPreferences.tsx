import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, Sun, Moon, Monitor } from "lucide-react";
import type { SignupData } from "./SignupWizard";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const usageOptions = [
  { value: "escape-stress", label: "Escape stress from too many PDFs" },
  { value: "safe-storage", label: "Safe storage" },
  { value: "afit-pdfs", label: "AFIT PDFs" },
  { value: "research", label: "Research" },
  { value: "other", label: "Other" },
];

interface Props {
  data: SignupData;
  updateData: (d: Partial<SignupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepPreferences({ data, updateData, onNext, onBack }: Props) {
  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl shadow-lg p-6 md:p-8 border border-border/50">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Your preferences</h2>
        <p className="text-sm text-muted-foreground mt-1">Step 4 of 5 — Personalize your experience</p>
      </div>

      <div className="space-y-5">
        {/* Theme */}
        <div className="space-y-2">
          <Label>Preferred Theme</Label>
          <div className="flex gap-2">
            {themeOptions.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateData({ preferredTheme: opt.value })}
                  className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                    data.preferredTheme === opt.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background hover:border-primary/40 text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Financial literacy */}
        <div className="space-y-2">
          <Label>Interested in financial literacy?</Label>
          <div className="flex gap-2">
            {[true, false].map(val => (
              <button
                key={String(val)}
                type="button"
                onClick={() => updateData({ financialLiteracyInterest: val })}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  data.financialLiteracyInterest === val
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background hover:border-primary/40 text-foreground"
                }`}
              >
                {val ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </div>

        {/* Usage reason */}
        <div className="space-y-2">
          <Label>Why are you using PDFNest?</Label>
          <div className="space-y-1.5">
            {usageOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateData({ usageReason: opt.value })}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all ${
                  data.usageReason === opt.value
                    ? "border-primary bg-primary/10 text-foreground font-medium"
                    : "border-border bg-background hover:border-primary/40 text-foreground"
                }`}
              >
                {opt.label}
                {data.usageReason === opt.value && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
          {data.usageReason === "other" && (
            <Input
              placeholder="Tell us why..."
              value={data.usageReasonOther}
              onChange={e => updateData({ usageReasonOther: e.target.value })}
              autoFocus
            />
          )}
        </div>

        {/* Age & Nickname row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Age</Label>
            <Input
              type="number"
              placeholder="e.g. 22"
              min={10}
              max={100}
              value={data.age}
              onChange={e => updateData({ age: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Nickname</Label>
            <Input
              placeholder="Study name"
              value={data.nickname}
              onChange={e => updateData({ nickname: e.target.value })}
              maxLength={30}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} size="icon" className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button className="flex-1" onClick={onNext}>
          Continue
        </Button>
      </div>

      <button type="button" onClick={onNext} className="w-full text-center text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors">
        Skip this step
      </button>
    </div>
  );
}
