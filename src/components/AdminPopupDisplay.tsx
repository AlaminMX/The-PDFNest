import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface PopupBanner {
  id: string;
  title: string;
  message: string;
  link_url: string | null;
  link_text: string | null;
  gradient_from: string;
  gradient_to: string;
}

export function AdminPopupDisplay() {
  const [banner, setBanner] = useState<PopupBanner | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    fetchPopupBanner();
  }, []);

  const fetchPopupBanner = async () => {
    try {
      // Get seen popup IDs
      const seenPopupsStr = localStorage.getItem("pdfnest_seen_popups");
      const seenPopups: string[] = seenPopupsStr ? JSON.parse(seenPopupsStr) : [];

      const { data, error } = await supabase
        .from("admin_banners")
        .select("id, title, message, link_url, link_text, gradient_from, gradient_to, start_date, end_date")
        .eq("is_active", true)
        .eq("banner_type", "popup")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const popup = data[0];
        
        // Check date range
        const now = new Date();
        if (popup.start_date && new Date(popup.start_date) > now) return;
        if (popup.end_date && new Date(popup.end_date) < now) return;
        
        // Check if already seen
        if (seenPopups.includes(popup.id)) return;

        setBanner(popup);
        setIsVisible(true);
      }
    } catch (error) {
      console.error("Error fetching popup banner:", error);
    }
  };

  const handleClose = () => {
    if (banner) {
      // Mark as seen
      const seenPopupsStr = localStorage.getItem("pdfnest_seen_popups");
      const seenPopups: string[] = seenPopupsStr ? JSON.parse(seenPopupsStr) : [];
      seenPopups.push(banner.id);
      localStorage.setItem("pdfnest_seen_popups", JSON.stringify(seenPopups));
    }
    setIsVisible(false);
  };

  if (!isVisible || !banner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold">{banner.title}</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-foreground">{banner.message}</p>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              {banner.link_url && (
                <Button
                  onClick={() => {
                    window.open(banner.link_url!, "_blank");
                    handleClose();
                  }}
                >
                  {banner.link_text || "Learn More"}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
