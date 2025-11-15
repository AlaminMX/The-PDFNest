import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Requirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

const requirements: Requirement[] = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character', test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

const calculateStrength = (password: string) => {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  
  if (strength <= 2) return { level: 'weak', color: 'bg-red-500', textColor: 'text-red-500' };
  if (strength <= 4) return { level: 'medium', color: 'bg-yellow-500', textColor: 'text-yellow-500' };
  return { level: 'strong', color: 'bg-green-500', textColor: 'text-green-500' };
};

interface PasswordStrengthIndicatorProps {
  password: string;
  show?: boolean;
}

export function PasswordStrengthIndicator({ password, show = true }: PasswordStrengthIndicatorProps) {
  if (!show || !password) return null;

  const strength = calculateStrength(password);
  const metRequirements = requirements.filter(req => req.test(password));
  const progressWidth = (metRequirements.length / requirements.length) * 100;

  return (
    <div className="space-y-3 mt-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Password strength:</span>
          <span className={cn("font-medium capitalize", strength.textColor)}>
            {strength.level}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300", strength.color)}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Password must contain:</p>
        {requirements.map((req) => {
          const isMet = req.test(password);
          return (
            <div key={req.id} className="flex items-center gap-2 text-xs">
              {isMet ? (
                <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              )}
              <span className={cn(
                "transition-colors",
                isMet ? "text-foreground" : "text-muted-foreground"
              )}>
                {req.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
