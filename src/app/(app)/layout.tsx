import type { ReactNode } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { ProtectedRoute } from "../../components/layout/ProtectedRoute";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}
