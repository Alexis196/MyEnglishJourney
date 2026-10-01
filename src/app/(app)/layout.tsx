import type { ReactNode } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { AppDataPrefetcher } from "../../components/layout/AppDataPrefetcher";
import { ProtectedRoute } from "../../components/layout/ProtectedRoute";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppDataPrefetcher />
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}
