import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { NotConfiguredScreen } from "../components/layout/NotConfiguredScreen";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, isLoading, isConfigured } = useAuth();
  const location = useLocation();

  if (!isConfigured) {
    return <NotConfiguredScreen />;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-light dark:bg-surface-dark">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
          role="status"
          aria-label="Cargando"
        />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
