import { Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { SignupData } from "./SignupWizard";
import { toast } from "sonner";

const schema = z.object({
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
  termsAccepted: z.boolean().refine(v => v, "You must accept the terms"),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface Props {
  data: SignupData;
  updateData: (d: Partial<SignupData>) => void;
  onNext: () => void;
  onSwitchToLogin: () => void;
  loading: boolean;
}

export function StepAccountBasics({ data, updateData, onNext, onSwitchToLogin, loading }: Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      schema.parse(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Create your account</h2>
        <p className="text-muted-foreground">Get started with PDFNest in seconds</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            placeholder="John Doe"
            value={data.fullName}
            onChange={e => updateData({ fullName: e.target.value })}
            required
            disabled={loading}
            autoComplete="name"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nickname">Display Name / Nickname</Label>
          <Input
            id="nickname"
            placeholder="What should we call you? (optional)"
            value={data.nickname}
            onChange={e => updateData({ nickname: e.target.value })}
            disabled={loading}
            maxLength={30}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">Defaults to your full name if left empty</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={data.email}
            onChange={e => updateData({ email: e.target.value })}
            required
            disabled={loading}
            autoComplete="email"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            value={data.password}
            onChange={e => updateData({ password: e.target.value })}
            required
            disabled={loading}
            autoComplete="new-password"
          />
          <PasswordStrengthIndicator password={data.password} show={data.password.length > 0} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <PasswordInput
            id="confirmPassword"
            placeholder="••••••••"
            value={data.confirmPassword}
            onChange={e => updateData({ confirmPassword: e.target.value })}
            required
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={data.termsAccepted}
            onCheckedChange={checked => updateData({ termsAccepted: checked as boolean })}
          />
          <label htmlFor="terms" className="text-sm text-muted-foreground leading-none">
            I accept the{" "}
            <Link to="/terms" className="text-primary hover:underline">Terms</Link>
            {" "}and{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </label>
        </div>

        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? "Creating account..." : "Continue"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button type="button" onClick={onSwitchToLogin} className="text-primary hover:underline font-medium">
          Sign in
        </button>
      </p>
    </div>
  );
}
