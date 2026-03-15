import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, GraduationCap, User } from "lucide-react";
import { useDepartments } from "@/hooks/useDepartments";
import type { SignupData } from "./SignupWizard";

interface Props {
  data: SignupData;
  updateData: (d: Partial<SignupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepUserType({ data, updateData, onNext, onBack }: Props) {
  const { departments, loading: loadingDepts } = useDepartments({ visibleOnly: true });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Are you a student?</h2>
        <p className="text-muted-foreground">This helps us personalize your experience</p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => updateData({ isStudent: true })}
          className={`flex-1 flex flex-col items-center gap-2 p-5 rounded-xl border text-sm font-medium transition-all ${
            data.isStudent === true
              ? "border-primary bg-primary/10 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.5),0_0_20px_hsl(var(--primary)/0.22)]"
              : "border-border bg-card/50 hover:border-primary/50 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.28),0_0_14px_hsl(var(--primary)/0.15)] text-foreground"
          }`}
        >
          <GraduationCap className="w-7 h-7" />
          Yes, I'm a student
        </button>
        <button
          type="button"
          onClick={() => updateData({ isStudent: false, school: "", schoolOther: "", departmentId: "" })}
          className={`flex-1 flex flex-col items-center gap-2 p-5 rounded-xl border text-sm font-medium transition-all ${
            data.isStudent === false
              ? "border-primary bg-primary/10 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.5),0_0_20px_hsl(var(--primary)/0.22)]"
              : "border-border bg-card/50 hover:border-primary/50 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.28),0_0_14px_hsl(var(--primary)/0.15)] text-foreground"
          }`}
        >
          <User className="w-7 h-7" />
          No
        </button>
      </div>

      {data.isStudent === true && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>School</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateData({ school: "AFIT", schoolOther: "" })}
                className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                  data.school === "AFIT"
                    ? "border-primary bg-primary/10 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.5),0_0_18px_hsl(var(--primary)/0.22)]"
                    : "border-border bg-card/50 hover:border-primary/50 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.28),0_0_12px_hsl(var(--primary)/0.14)] text-foreground"
                }`}
              >
                AFIT
              </button>
              <button
                type="button"
                onClick={() => updateData({ school: "others" })}
                className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                  data.school === "others"
                    ? "border-primary bg-primary/10 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.5),0_0_18px_hsl(var(--primary)/0.22)]"
                    : "border-border bg-card/50 hover:border-primary/50 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.28),0_0_12px_hsl(var(--primary)/0.14)] text-foreground"
                }`}
              >
                Others
              </button>
            </div>
          </div>

          {data.school === "others" && (
            <div className="space-y-2">
              <Label>School Name</Label>
              <Input
                placeholder="Enter your school name"
                value={data.schoolOther}
                onChange={e => updateData({ schoolOther: e.target.value })}
                autoFocus
                className="h-11"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Department <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Select value={data.departmentId} onValueChange={v => updateData({ departmentId: v })}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={loadingDepts ? "Loading..." : "Select department"} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {departments.map(dept => (
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

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="icon" className="shrink-0 h-11 w-11">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button className="flex-1 h-11" onClick={onNext} disabled={data.isStudent === null}>
          Continue
        </Button>
      </div>
    </div>
  );
}
