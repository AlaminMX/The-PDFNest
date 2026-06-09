import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminStatus } from "./useAdminStatus";

/**
 * Subscribes admins to realtime INSERTs of pending submissions and surfaces
 * a toast + browser Notification (when permitted).
 */
export function useAdminNotifications() {
  const { isAdmin, loading } = useAdminStatus();
  const askedRef = useRef(false);

  useEffect(() => {
    if (loading || !isAdmin) return;

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default" &&
      !askedRef.current
    ) {
      askedRef.current = true;
      Notification.requestPermission().catch(() => {});
    }

    const notify = (title: string, body: string) => {
      toast.info(title, { description: body });
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, { body, icon: "/pdfnest-logo.png" });
        }
      } catch {}
    };

    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_uploads" },
        (payload) => {
          const row: any = payload.new;
          if (row?.status === "pending") {
            notify("New material submitted", row.title || "Pending review");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "final_year_projects" },
        (payload) => {
          const row: any = payload.new;
          if (row?.status === "pending") {
            notify("New final-year project", row.title || "Pending review");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, loading]);
}
