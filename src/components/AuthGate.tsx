import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export function AuthGate({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
