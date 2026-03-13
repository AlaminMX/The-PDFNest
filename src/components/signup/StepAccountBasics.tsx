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

const GoogleIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
    <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.5-5.4 3.5-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.6 2.9 14.5 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6.9 0 9.2-4.8 9.2-7.3 0-.5-.1-.9-.1-1.3H12z"/>
    <path fill="#34A853" d="M2.8 11.2c0 1.7.6 3.2 1.7 4.5l2.8-2.2c-.4-.7-.6-1.4-.6-2.3s.2-1.6.6-2.3L4.5 6.7a8.8 8.8 0 0 0-1.7 4.5z"/>
    <path fill="#FBBC05" d="M12 20.4c2.5 0 4.6-.8 6.2-2.3l-3-2.4c-.8.6-1.8.9-3.2.9-2.5 0-4.7-1.7-5.5-4L3.6 15c1.6 3.2 4.9 5.4 8.4 5.4z"/>
    <path fill="#4285F4" d="M21.2 12.8c0-.6-.1-1.1-.2-1.6H12v3.9h5.4c-.3 1.3-1 2.3-2.1 3l3 2.4c1.8-1.6 2.9-4.1 2.9-7.7z"/>
  </svg>
);

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
  onGoogleSignup: () => void;
  onSwitchToLogin: () => void;
  loading: boolean;
}

export function StepAccountBasics({ data, updateData, onNext, onGoogleSignup, onSwitchToLogin, loading }: Props) {
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
        <Button type="button" variant="outline" className="w-full h-11" onClick={onGoogleSignup} disabled={loading}>
          <GoogleIcon />
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or use email</span>
          </div>
        </div>

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
