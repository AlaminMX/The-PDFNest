import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartBottomNav } from "@/components/SmartBottomNav";

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-28 md:pb-10">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/30">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9"
              asChild
            >
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <span className="font-semibold text-base">Profile</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-10 space-y-5">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="relative h-20 w-24 perspective-[600px]">
            <div className="absolute left-2 top-2 h-16 w-10 origin-right rounded-l-lg bg-primary/20 shadow-sm animate-[flip-page-left_1.2s_ease-in-out_infinite]" />
            <div className="absolute right-2 top-2 h-16 w-10 origin-left rounded-r-lg bg-primary/35 shadow-sm animate-[flip-page-right_1.2s_ease-in-out_infinite]" />
            <div className="absolute left-1/2 top-2 h-16 w-px -translate-x-1/2 bg-primary/40" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Loading your profile...
          </p>
        </div>

        {/* Hero card skeleton */}
        <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
          {/* Banner */}
          <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/8 to-transparent" />
          {/* Avatar + name */}
          <div className="px-5 pb-5 -mt-10">
            <div className="flex items-end justify-between gap-3">
              <Skeleton className="w-20 h-20 rounded-full border-4 border-card" />
              <Skeleton className="h-8 w-16 rounded-full mb-1" />
            </div>
            <div className="mt-3 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-52" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-5 w-28 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>
          </div>
          {/* Stats row */}
          <div className="border-t border-border/30 flex divide-x divide-border/30">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1.5 py-4 flex-1"
              >
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-2.5 w-12" />
              </div>
            ))}
          </div>
        </div>

        {/* Storage skeleton */}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16 ml-1" />
          <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        {/* List section skeleton (recent / categories) */}
        {[1, 2].map((s) => (
          <div key={s} className="space-y-1.5">
            <Skeleton className="h-3 w-20 ml-1" />
            <div className="rounded-2xl bg-card border border-border/40 overflow-hidden divide-y divide-border/30">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/5" />
                    <Skeleton className="h-2.5 w-1/4" />
                  </div>
                  <Skeleton className="w-4 h-4 rounded shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      <SmartBottomNav />
    </div>
  );
}
