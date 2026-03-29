import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Paths that are genuinely public — show real 404 for these
const PUBLIC_PREFIXES = [
  "/", "/auth", "/terms", "/privacy", "/reset-password",
  "/afit-pdfs", "/school-store", "/user/", "/leaderboard",
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404:", location.pathname);

    const isPublic = PUBLIC_PREFIXES.some(p =>
      location.pathname === p || location.pathname.startsWith(p + "/") || location.pathname === p.replace(/\/$/, "")
    );

    if (isPublic) return; // Genuinely missing public page — show 404

    // Protected-looking URL visited by guest → redirect to sign in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        sessionStorage.setItem("redirectAfterLogin", location.pathname + location.search);
        navigate("/auth", { replace: true });
      }
      // Logged-in user on non-existent page → stay on 404
    });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4 px-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">This page doesn't exist.</p>
        <a href="/" className="text-primary underline hover:text-primary/80 text-sm">Go home</a>
      </div>
    </div>
  );
};

export default NotFound;
