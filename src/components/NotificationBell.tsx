import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let userId: string | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      userId = user.id;

      // Initial fetch
      supabase
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .then(({ count }) => setUnread(count || 0));

      // Realtime subscription
      const channel = supabase
        .channel(`bell:${user.id}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        }, () => {
          supabase
            .from("user_notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false)
            .then(({ count }) => setUnread(count || 0));
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    });
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
