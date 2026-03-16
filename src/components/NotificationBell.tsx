import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      // Initial count
      const { count } = await supabase
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (mounted) setUnread(count || 0);

      // Realtime
      const refreshCount = async () => {
        const { count: c } = await supabase
          .from("user_notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false);
        if (mounted) setUnread(c || 0);
      };

      channelRef.current = supabase
        .channel(`bell:${user.id}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        }, refreshCount)
        .subscribe();
    };

    init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return (
    <Link
      to="/notifications"
      className="relative inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent h-9 w-9 transition-colors"
      aria-label="Notifications"
    >
      <Bell className="w-4 h-4" />
      {unread > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
      )}
    </Link>
  );
}
