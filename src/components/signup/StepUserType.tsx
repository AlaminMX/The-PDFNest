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
    <div className="bg-card/80 backdrop-blur-sm rounded-xl shadow-lg p-6 md:p-8 border border-border/50">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Are you a student?</h2>
        <p className="text-sm text-muted-foreground mt-1">Step 3 of 5 — User type</p>
      </div>

      <div className="flex gap-3 mb-5">
        <button
          type="button"
          onClick={() => updateData({ isStudent: true })}
          className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border text-sm font-medium transition-all ${
            data.isStudent === true
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-background hover:border-primary/40 text-foreground"
          }`}
        >
          <GraduationCap className="w-6 h-6" />
          Yes
        </button>
        <button
          type="button"
          onClick={() => updateData({ isStudent: false, school: "", schoolOther: "", departmentId: "" })}
          className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border text-sm font-medium transition-all ${
            data.isStudent === false
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-background hover:border-primary/40 text-foreground"
          }`}
        >
          <User className="w-6 h-6" />
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
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  data.school === "AFIT"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background hover:border-primary/40 text-foreground"
                }`}
              >
                AFIT
              </button>
              <button
                type="button"
                onClick={() => updateData({ school: "others" })}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  data.school === "others"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background hover:border-primary/40 text-foreground"
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
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Department <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Select value={data.departmentId} onValueChange={v => updateData({ departmentId: v })}>
              <SelectTrigger>
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

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} size="icon" className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button className="flex-1" onClick={onNext} disabled={data.isStudent === null}>
          Continue
        </Button>
      </div>

      <button type="button" onClick={onNext} className="w-full text-center text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors">
        Skip this step
      </button>
    </div>
  );
}
