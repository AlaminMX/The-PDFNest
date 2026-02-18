import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check } from "lucide-react";
import type { SignupData } from "./SignupWizard";

const options = [
  { value: "whatsapp", label: "WhatsApp group" },
  { value: "instagram", label: "Instagram" },
  { value: "friend", label: "A friend" },
  { value: "lecturer", label: "Lecturer / Teacher" },
  { value: "google", label: "Google" },
  { value: "other", label: "Other" },
];

interface Props {
  data: SignupData;
  updateData: (d: Partial<SignupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepDiscoverySource({ data, updateData, onNext, onBack }: Props) {
  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl shadow-lg p-6 md:p-8 border border-border/50">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">How did you find us?</h2>
        <p className="text-sm text-muted-foreground mt-1">Step 2 of 5 — Discovery source</p>
      </div>

      <div className="space-y-2.5">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => updateData({ discoverySource: opt.value })}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
              data.discoverySource === opt.value
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-background hover:border-primary/40 text-foreground"
            }`}
          >
            {opt.label}
            {data.discoverySource === opt.value && <Check className="w-4 h-4 text-primary" />}
          </button>
        ))}

        {data.discoverySource === "other" && (
          <Input
            placeholder="Tell us where..."
            value={data.discoverySourceOther}
            onChange={e => updateData({ discoverySourceOther: e.target.value })}
            className="mt-2"
            autoFocus
          />
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} size="icon" className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button className="flex-1" onClick={onNext} disabled={!data.discoverySource}>
          Continue
        </Button>
      </div>

      <button type="button" onClick={onNext} className="w-full text-center text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors">
        Skip this step
      </button>
    </div>
  );
}
