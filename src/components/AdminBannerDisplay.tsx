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
}

interface AdminBannerDisplayProps {
  showOnProfile?: boolean;
}

export function AdminBannerDisplay({ showOnProfile = false }: AdminBannerDisplayProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBanners();
    loadDismissed();
  }, [showOnProfile]);

  const loadDismissed = () => {
    const stored = localStorage.getItem("pdfnest_dismissed_banners");
    if (stored) {
      try {
        setDismissedIds(new Set(JSON.parse(stored)));
      } catch {
        localStorage.removeItem("pdfnest_dismissed_banners");
      }
    }
  };

  const fetchBanners = async () => {
    try {
      let query = supabase
        .from("admin_banners")
        .select("id, title, message, link_url, link_text, gradient_from, gradient_to")
        .eq("is_active", true)
        .eq("banner_type", "inline");

      if (showOnProfile) {
        query = query.eq("show_on_profile", true);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by date range
      const now = new Date();
      const filteredBanners = (data || []).filter((banner: any) => {
        if (banner.start_date && new Date(banner.start_date) > now) return false;
        if (banner.end_date && new Date(banner.end_date) < now) return false;
        return true;
      });

      setBanners(filteredBanners);
    } catch (error) {
      console.error("Error fetching banners:", error);
    }
  };

  const handleDismiss = (bannerId: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(bannerId);
    setDismissedIds(newDismissed);
    localStorage.setItem("pdfnest_dismissed_banners", JSON.stringify([...newDismissed]));
  };

  const visibleBanners = banners.filter((b) => !dismissedIds.has(b.id));

  if (visibleBanners.length === 0) return null;

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {visibleBanners.map((banner) => (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`relative overflow-hidden rounded-lg text-white`}
            style={{
              background: `linear-gradient(to right, var(--${banner.gradient_from || "primary"}), var(--${banner.gradient_to || "primary"}))`,
            }}
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <Sparkles className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-medium">{banner.title}</p>
                    <p className="text-sm text-white/90">{banner.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {banner.link_url && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-white/20 hover:bg-white/30 text-white border-0"
                      onClick={() => window.open(banner.link_url!, "_blank")}
                    >
                      {banner.link_text || "Learn More"}
                    </Button>
                  )}
                  <button
                    onClick={() => handleDismiss(banner.id)}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
