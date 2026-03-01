import { useAppSettings } from "@/hooks/useAppSettings";

export function RamadanDecoration() {
  const { settings, loading } = useAppSettings();

  if (loading || !settings.ramadan_theme_enabled) return null;

  return (
    <div className="fixed top-0 right-6 z-50 pointer-events-none" aria-hidden="true">
      {/* String */}
      <div className="w-px h-8 bg-primary/30 mx-auto" />
      {/* Crescent moon */}
      <div
        className="animate-[sway_4s_ease-in-out_infinite] origin-top"
        style={{
          animation: "sway 4s ease-in-out infinite",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          className="text-primary drop-shadow-lg"
        >
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
            fill="currentColor"
            opacity="0.85"
          />
        </svg>
        {/* Small star */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          className="text-primary/60 absolute -left-2 top-1"
        >
          <path
            d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4 5.6 21.2 8 14l-6-4.8h7.6L12 2z"
            fill="currentColor"
          />
        </svg>
      </div>
      <style>{`
        @keyframes sway {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
      `}</style>
    </div>
  );
}
