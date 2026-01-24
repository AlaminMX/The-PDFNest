import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell } from "lucide-react";

export function NotificationsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Notifications</h2>
        </div>
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="rounded-lg border p-4 space-y-6">
        {/* Skeleton groups */}
        {[1, 2].map((groupIndex) => (
          <div key={groupIndex} className="space-y-3">
            {/* Group header */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            
            {/* Notification cards */}
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-background">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-5 h-5 rounded mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
