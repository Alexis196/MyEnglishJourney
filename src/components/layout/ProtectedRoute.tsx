"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthProvider";
import { NotConfiguredScreen } from "./NotConfiguredScreen";

function Spinner() {
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

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, isLoading, isConfigured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const mustLogin = isConfigured && !isLoading && !session;

  useEffect(() => {
    if (mustLogin) router.replace(`/login?from=${encodeURIComponent(pathname)}`);
  }, [mustLogin, router, pathname]);

  if (!isConfigured) {
    return <NotConfiguredScreen />;
  }

  if (isLoading || mustLogin) {
    return <Spinner />;
  }

  return <>{children}</>;
}
