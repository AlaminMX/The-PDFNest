import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getCurrentSessionId, logActivity, startSession } from "@/lib/sessionLogger";

export function ActivityRouteTracker() {
  const location = useLocation();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    if (!getCurrentSessionId()) {
      void startSession();
    }
  }, []);

  useEffect(() => {
    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    if (previousPath.current === currentPath) return;

    previousPath.current = currentPath;

    void logActivity("page_view", {
      path: location.pathname,
      search: location.search || null,
      hash: location.hash || null,
      source: "route_tracker",
    });
  }, [location.pathname, location.search, location.hash]);

  return null;
}
