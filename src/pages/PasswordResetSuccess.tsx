import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export default function PasswordResetSuccess() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/auth");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-xl shadow-lg p-8 border border-border/50 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center"
          >
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </motion.div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Password Updated!
          </h1>
          <p className="text-muted-foreground mb-6">
            Your password has been successfully changed. You can now sign in with your new password.
          </p>
          
          <p className="text-sm text-muted-foreground mb-4">
            Redirecting to login in <span className="font-semibold text-foreground">{countdown}</span> seconds...
          </p>
          
          <Button
            onClick={() => navigate("/auth")}
            className="w-full"
          >
            Sign In Now
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
