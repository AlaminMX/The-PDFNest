import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, Sun, Moon, Monitor, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { SignupData } from "./SignupWizard";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const usageOptions = [
  { value: "escape-stress", label: "My PDFs are everywhere and it's stressing me out." },
  { value: "safe-storage", label: "I just want one safe place for all my school materials" },
  { value: "afit-pdfs", label: "Access to AFIT resources" },
  { value: "research", label: "For research and long-term storage" },
  { value: "other", label: "Other" },
];

interface Props {
  data: SignupData;
  updateData: (d: Partial<SignupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepPreferences({ data, updateData, onNext, onBack }: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const selectedDate = data.dateOfBirth ? new Date(data.dateOfBirth) : undefined;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      updateData({ dateOfBirth: format(date, "yyyy-MM-dd") });
      setCalendarOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Your preferences</h2>
        <p className="text-muted-foreground">Personalize your PDFNest experience</p>
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
                  className={`flex-1 flex flex-col items-center gap-1.5 p-3.5 rounded-xl border text-xs font-medium transition-all ${
                    data.preferredTheme === opt.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card/50 hover:border-primary/40 text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {opt.label}
                </button>
              );
            })}
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
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                  data.usageReason === opt.value
                    ? "border-primary bg-primary/10 text-foreground font-medium"
                    : "border-border bg-card/50 hover:border-primary/40 text-foreground"
                }`}
              >
                {opt.label}
                {data.usageReason === opt.value && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-11 justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick your date of birth"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                captionLayout="dropdown-buttons"
                fromYear={1950}
                toYear={new Date().getFullYear()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="icon" className="shrink-0 h-11 w-11">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button className="flex-1 h-11" onClick={onNext}>
          Continue
        </Button>
      </div>

      <button type="button" onClick={onNext} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
        Skip this step
      </button>
    </div>
  );
}
