import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Banner {
  id: string;
  title: string;
  message: string;
  link_url: string | null;
  link_text: string | null;
  gradient_from: string;
  gradient_to: string;
  banner_type: string;
}

const HIDDEN_LINK_TEXTS = new Set(["Start using PDFNest", "Browse AFIT PDFs"]);

interface AdminBannerDisplayProps {
  showOnProfile?: boolean;
}

/** Convert stored color string to an actual CSS color value.
 *  Supports: hex (#fff, #ffffff), Tailwind-ish names (blue-600 → a curated map),
 *  or plain CSS color names / hsl / rgb.
 */
function resolveColor(raw: string): string {
  if (!raw) return "#3b82f6";
  const s = raw.trim();
  // Already a CSS color (hex, rgb, hsl, named)
  if (s.startsWith("#") || s.startsWith("rgb") || s.startsWith("hsl")) return s;

  // Tailwind class-like: e.g. "blue-600", "indigo-500", "rose-400"
  const tailwindMap: Record<string, string> = {
    "slate-500": "#64748b", "gray-500": "#6b7280", "zinc-500": "#71717a",
    "red-400": "#f87171", "red-500": "#ef4444", "red-600": "#dc2626",
    "orange-400": "#fb923c", "orange-500": "#f97316", "orange-600": "#ea580c",
    "amber-400": "#fbbf24", "amber-500": "#f59e0b", "amber-600": "#d97706",
    "yellow-400": "#facc15", "yellow-500": "#eab308",
    "lime-500": "#84cc16", "lime-600": "#65a30d",
    "green-400": "#4ade80", "green-500": "#22c55e", "green-600": "#16a34a",
    "teal-500": "#14b8a6", "teal-600": "#0d9488",
    "cyan-500": "#06b6d4", "cyan-600": "#0891b2",
    "sky-500": "#0ea5e9", "sky-600": "#0284c7",
    "blue-400": "#60a5fa", "blue-500": "#3b82f6", "blue-600": "#2563eb",
    "indigo-400": "#818cf8", "indigo-500": "#6366f1", "indigo-600": "#4f46e5",
    "violet-500": "#8b5cf6", "violet-600": "#7c3aed",
    "purple-400": "#c084fc", "purple-500": "#a855f7", "purple-600": "#9333ea",
    "pink-400": "#f472b6", "pink-500": "#ec4899", "pink-600": "#db2777",
    "rose-400": "#fb7185", "rose-500": "#f43f5e", "rose-600": "#e11d48",
  };
  if (tailwindMap[s]) return tailwindMap[s];

  // Try as a plain CSS named color (browser will ignore invalid ones)
  return s;
}

export function AdminBannerDisplay({ showOnProfile = false }: AdminBannerDisplayProps) {
  const [inlineBanners, setInlineBanners] = useState<Banner[]>([]);
  const [popupBanner, setPopupBanner] = useState<Banner | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [popupDismissed, setPopupDismissed] = useState(false);

  useEffect(() => {
    loadDismissed();
    fetchBanners();
  }, [showOnProfile]);

  const loadDismissed = () => {
    try {
      const stored = localStorage.getItem("pdfnest_dismissed_banners");
      if (stored) setDismissedIds(new Set(JSON.parse(stored)));
    } catch {
      localStorage.removeItem("pdfnest_dismissed_banners");
    }
  };

  const fetchBanners = async () => {
    try {
      let query = supabase
        .from("admin_banners")
        .select("id, title, message, link_url, link_text, gradient_from, gradient_to, banner_type")
        .eq("is_active", true);

      if (showOnProfile) query = query.eq("show_on_profile", true);

      const { data, error } = await query;
      if (error) throw error;

      const now = new Date();
      const active = (data || []).filter((b: any) => {
        if (b.start_date && new Date(b.start_date) > now) return false;
        if (b.end_date && new Date(b.end_date) < now) return false;
        return true;
      }) as Banner[];

      setInlineBanners(active.filter((b) => b.banner_type !== "popup"));
      const popup = active.find((b) => b.banner_type === "popup") ?? null;
      setPopupBanner(popup);
    } catch (err) {
      console.error("Error fetching banners:", err);
    }
  };

  const dismissInline = (id: string) => {
    const next = new Set(dismissedIds);
    next.add(id);
    setDismissedIds(next);
    localStorage.setItem("pdfnest_dismissed_banners", JSON.stringify([...next]));
  };

  const visibleInline = inlineBanners.filter((b) => !dismissedIds.has(b.id));

  return (
    <>
      {/* ── Inline banners ── */}
      <div className="space-y-2">
        <AnimatePresence>
          {visibleInline.map((banner) => {
            const from = resolveColor(banner.gradient_from);
            const to = resolveColor(banner.gradient_to);
            return (
              <motion.div
                key={banner.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative overflow-hidden rounded-lg text-white"
                style={{ background: `linear-gradient(to right, ${from}, ${to})` }}
              >
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Sparkles className="h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium">{banner.title}</p>
                      <p className="text-sm text-white/90 truncate">{banner.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {banner.link_url && banner.link_text && !HIDDEN_LINK_TEXTS.has(banner.link_text) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/20 hover:bg-white/30 text-white border-0"
                        onClick={() => window.open(banner.link_url!, "_blank")}
                      >
                        {banner.link_text}
                      </Button>
                    )}
                    <button
                      onClick={() => dismissInline(banner.id)}
                      className="p-1 hover:bg-white/20 rounded-full transition-colors"
                      aria-label="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Popup banner ── */}
      <AnimatePresence>
        {popupBanner && !popupDismissed && !dismissedIds.has(popupBanner.id) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setPopupDismissed(true)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl overflow-hidden text-white shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${resolveColor(popupBanner.gradient_from)}, ${resolveColor(popupBanner.gradient_to)})`,
              }}
            >
              <button
                onClick={() => setPopupDismissed(true)}
                className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="p-8 text-center space-y-4">
                <Sparkles className="h-10 w-10 mx-auto opacity-90" />
                <div>
                  <h2 className="text-xl font-bold mb-2">{popupBanner.title}</h2>
                  <p className="text-white/90 text-sm leading-relaxed">{popupBanner.message}</p>
                </div>
                {popupBanner.link_url && popupBanner.link_text && (
                  <Button
                    className="bg-white text-gray-900 hover:bg-white/90 font-semibold"
                    onClick={() => { window.open(popupBanner.link_url!, "_blank"); setPopupDismissed(true); }}
                  >
                    {popupBanner.link_text}
                  </Button>
                )}
                <button
                  onClick={() => setPopupDismissed(true)}
                  className="block w-full text-xs text-white/70 hover:text-white transition-colors mt-2"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
