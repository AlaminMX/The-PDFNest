import { useAppSettings } from "@/hooks/useAppSettings";
import { useEffect } from "react";

export function RamadanDecoration() {
  const { settings, loading } = useAppSettings();

  // Add/remove .ramadan class on root element for site-wide gold theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.ramadan_theme_enabled) {
      root.classList.add("ramadan");
    } else {
      root.classList.remove("ramadan");
    }
    return () => root.classList.remove("ramadan");
  }, [settings.ramadan_theme_enabled]);

  if (loading || !settings.ramadan_theme_enabled) return null;

  return (
    <div className="fixed top-0 right-8 z-40 pointer-events-none" aria-hidden="true">
      {/* Golden string */}
      <div className="w-px h-12 mx-auto" style={{ background: 'linear-gradient(to bottom, transparent, #D4A537)' }} />
      {/* Swaying decoration */}
      <div
        className="origin-top"
        style={{ animation: "ramadan-sway 4s ease-in-out infinite" }}
      >
        {/* Crescent moon - golden */}
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          className="drop-shadow-lg"
        >
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
            fill="#D4A537"
            opacity="0.9"
          />
        </svg>
        {/* Small golden star */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          className="absolute -left-3 top-2"
        >
          <path
            d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4 5.6 21.2 8 14l-6-4.8h7.6L12 2z"
            fill="#D4A537"
            opacity="0.6"
          />
        </svg>
      </div>
      <style>{`
        @keyframes ramadan-sway {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
      `}</style>
    </div>
  );
}
