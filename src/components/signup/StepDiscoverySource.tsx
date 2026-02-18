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
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">How did you find us?</h2>
        <p className="text-muted-foreground">Help us understand where our users come from</p>
      </div>

      <div className="space-y-2.5">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => updateData({ discoverySource: opt.value })}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-sm font-medium transition-all ${
              data.discoverySource === opt.value
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card/50 hover:border-primary/40 text-foreground"
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
            className="mt-2 h-11"
            autoFocus
          />
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="icon" className="shrink-0 h-11 w-11">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button className="flex-1 h-11" onClick={onNext} disabled={!data.discoverySource}>
          Continue
        </Button>
      </div>

      <button type="button" onClick={onNext} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
        Skip this step
      </button>
    </div>
  );
}
