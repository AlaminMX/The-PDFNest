import { Bell, Check, FileText, Calendar, Building2, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { NotificationsSkeleton } from "./NotificationsSkeleton";

export function NotificationsInbox() {
  const { user } = useAuth();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications(user?.id);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_lecture_note":
        return <FileText className="h-5 w-5 text-primary" />;
      case "timetable_update":
        return <Calendar className="h-5 w-5 text-secondary" />;
      case "upload_approved":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "upload_rejected":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getNotificationTitle = (notification: Notification) => {
    const { notification_type, title, metadata } = notification as any;

    // Use the title column if available (from the fixed RPC)
    if (title) return title;

    // Fallback to deriving from type + metadata
    if (notification_type === "new_lecture_note") {
      return `New lecture note: ${metadata?.note_title || "Untitled"}`;
    }
    if (notification_type === "timetable_update") {
      const changeMessage = metadata?.change_message || "Timetable updated";
      return `${changeMessage}: ${metadata?.course_code || ""}`;
    }
    if (notification_type === "upload_approved") {
      return `Material Approved! 🎉`;
    }
    if (notification_type === "upload_rejected") {
      return `Material Not Approved`;
    }
    return "Notification";
  };

  const getNotificationBody = (notification: Notification) => {
    const { notification_type, message, metadata } = notification as any;

    // Use message column if available (from the fixed RPC)
    if (message) return message;

    // Fallback
    if (notification_type === "new_lecture_note") {
      return `${metadata?.course_code || ""} • ${metadata?.department_name || ""}`;
    }
    if (notification_type === "timetable_update") {
      const changedBy = metadata?.changed_by ? `by ${metadata.changed_by}` : "";
      return `${metadata?.course_name || ""} • ${metadata?.department_name || ""} ${changedBy}`.trim();
    }
    if (notification_type === "upload_approved") {
      const note = metadata?.note;
      return note
        ? `Your material "${metadata?.title || ""}" is now live. Note: ${note}`
        : `Your material "${metadata?.title || ""}" is now live.`;
    }
    if (notification_type === "upload_rejected") {
      const reason = metadata?.reason && metadata.reason !== "No reason provided"
        ? `Reason: ${metadata.reason}`
        : "";
      return `Your material "${metadata?.title || ""}" was not approved. ${reason}`.trim();
    }
    return "";
  };

  // Group notifications: approval/rejection types don't have a useful department_name
  // in metadata, so group them under a sensible label
  const getGroupLabel = (notification: Notification) => {
    const type = (notification as any).notification_type;
    if (type === "upload_approved" || type === "upload_rejected") {
      return "Your Contributions";
    }
    return (notification as any).metadata?.department_name || "Other";
  };

  const groupedNotifications = notifications.reduce((acc, notif) => {
    const label = getGroupLabel(notif);
    if (!acc[label]) acc[label] = [];
    acc[label].push(notif);
    return acc;
  }, {} as Record<string, Notification[]>);

  if (loading && notifications.length === 0) {
    return <NotificationsSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <Badge variant="default" className="ml-2">
              {unreadCount} new
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground/70">
              You'll be notified about new materials, timetable updates, and your contribution status
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px] rounded-lg border">
          <div className="p-4 space-y-6">
            {Object.entries(groupedNotifications).map(([groupLabel, notifs]) => (
              <div key={groupLabel} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  {groupLabel}
                </div>
                <div className="space-y-2">
                  {notifs.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`transition-colors ${
                        !notification.is_read
                          ? "bg-primary/5 border-primary/20"
                          : "bg-background"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {getNotificationIcon((notification as any).notification_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-sm">
                                {getNotificationTitle(notification)}
                              </p>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(new Date(notification.created_at), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {getNotificationBody(notification)}
                            </p>
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 h-7 text-xs"
                                onClick={() => markAsRead(notification.id)}
                              >
                                Mark as read
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
           }
    
