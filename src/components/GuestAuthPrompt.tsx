import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, BookOpen } from "lucide-react";

interface GuestAuthPromptProps {
  open: boolean;
  onClose: () => void;
  /** Describes what requires sign-in, e.g. "download files" */
  action?: string;
}

export function GuestAuthPrompt({ open, onClose, action }: GuestAuthPromptProps) {
  const navigate = useNavigate();

  const goToAuth = (mode: "login" | "signup") => {
    sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
    onClose();
    // Small delay so dialog closes smoothly before navigation
    setTimeout(() => navigate("/auth"), 150);
  };

  const actionText = action ? `to ${action}` : "to do that";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">Join PDFNest 😊</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-1">
            You need a free account {actionText}. It only takes a moment — and you'll get access to all materials, uploads, and more!
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col mt-2">
          <Button
            className="w-full gap-2"
            onClick={() => goToAuth("signup")}
          >
            <UserPlus className="w-4 h-4" />
            Create Free Account
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => goToAuth("login")}
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
          >
            Maybe later
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
