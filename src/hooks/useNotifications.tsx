import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  user_id: string;
  department_id: string | null;
  notification_type: string;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      setNotifications((data || []) as Notification[]);
      setUnreadCount((data || []).filter((n) => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) {
        // Revert on error
        fetchNotifications();
        throw error;
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        // Revert on error
        fetchNotifications();
        throw error;
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, [userId, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}