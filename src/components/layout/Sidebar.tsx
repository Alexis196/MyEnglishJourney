"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Mic,
  X,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { Logo } from "../ui/Logo";
import { useAuth } from "../../context/AuthProvider";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/program", label: "Programa 90 días", icon: BookOpen },
  { to: "/speaking", label: "Speaking Lab", icon: Mic },
  { to: "/profile", label: "Perfil", icon: User },
];

/**
 * Decorative London skyline that rises from the bottom of the sidebar.
 * It only fills the lower part and a mask fades its top edge into the sidebar background,
 * so it never sits behind the menu items.
 */
function SidebarScenery() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[min(52%,540px)] overflow-hidden"
    >
      {/* Dark/light skyline comes from --art-sidebar; the mask fades its top edge into the sidebar background. */}
      <div className="h-full w-full bg-[image:var(--art-sidebar)] bg-cover bg-no-repeat bg-[position:35%_bottom] [mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.55)_35%,black_75%)]" />
    </div>
  );
}

function NavLinks({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-1">
      {navItems.map(({ to, label, icon: Icon }) => {
        const isActive = pathname === to || pathname.startsWith(`${to}/`);
        return (
          <Link
            key={to}
            href={to}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            aria-label={collapsed ? label : undefined}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              collapsed && "justify-center px-0",
              isActive
                ? "border-[var(--nav-active-border)] [background:var(--nav-active-bg)] text-[var(--nav-active-text)] before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[3px] before:rounded-full before:bg-[var(--nav-active-bar)]"
                : "border-transparent text-[var(--nav-text)] hover:bg-[var(--nav-hover-bg)] hover:text-ink",
            )}
          >
            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0 transition-colors",
                isActive
                  ? "text-[var(--nav-active-icon)]"
                  : "text-[var(--nav-icon)] group-hover:text-ink",
              )}
              aria-hidden="true"
            />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

/** "Salir" lives in the nav (same look as the menu items) so the topbar stays uncluttered on small screens. */
function SignOutButton({
  collapsed,
  onDone,
}: {
  collapsed: boolean;
  onDone?: () => void;
}) {
  const { signOut } = useAuth();

  return (
    <button
      type="button"
      onClick={() => {
        onDone?.();
        void signOut();
      }}
      title={collapsed ? "Salir" : undefined}
      aria-label={collapsed ? "Salir" : undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-[var(--nav-text)] transition-colors",
        "hover:bg-[var(--nav-hover-bg)] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        collapsed && "justify-center px-0",
      )}
    >
      <LogOut
        className="h-[18px] w-[18px] shrink-0 text-[var(--nav-icon)] group-hover:text-ink"
        aria-hidden="true"
      />
      {!collapsed && <span className="truncate">Salir</span>}
    </button>
  );
}

export function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* The wrapper is not clipped, so the collapse handle can straddle the sidebar's right edge. */}
      <div className="relative z-20 hidden shrink-0 md:flex">
        <motion.aside
          animate={{ width: collapsed ? 76 : 240 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="relative isolate flex shrink-0 flex-col overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] px-3 py-4"
        >
          {/* The skyline is skipped in the collapsed rail, where it would only add noise. */}
          {!collapsed && <SidebarScenery />}

          <div
            className={cn(
              "relative z-10 mb-5 flex items-center gap-2 px-2",
              collapsed && "justify-center px-0",
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Logo className="h-8 w-8 shrink-0" />
              {!collapsed && (
                <span className="truncate text-sm font-semibold text-ink">
                  My English Journey
                </span>
              )}
            </div>
          </div>

          <div className="relative z-10 flex-1">
            {/* Theme selector starts at the same level as the menu so it is the first thing you see. */}
            <div className={cn("mb-4", collapsed && "flex justify-center")}>
              <ThemeToggle vertical={collapsed} block={!collapsed} />
            </div>
            <NavLinks collapsed={collapsed} />
            {/* Kept with the menu (not at the bottom) so it never sits on top of the skyline illustration. */}
            <div className="mt-3 border-t border-[var(--sidebar-border)] pt-3">
              <SignOutButton collapsed={collapsed} />
            </div>
          </div>
        </motion.aside>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute right-0 top-[150px] z-30 flex h-7 w-7 translate-x-1/2 items-center justify-center rounded-full border border-[var(--seg-border)] bg-card text-[var(--nav-text)] shadow-card transition-colors hover:border-primary hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={
            collapsed ? "Expandir barra lateral" : "Contraer barra lateral"
          }
          title={
            collapsed ? "Expandir barra lateral" : "Contraer barra lateral"
          }
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={onMobileClose}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute inset-y-0 left-0 isolate flex w-64 max-w-[80vw] flex-col overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] px-3 py-4 shadow-raised"
            >
              <SidebarScenery />

              <div className="relative z-10 mb-6 flex items-center justify-between gap-2 px-2">
                <div className="flex items-center gap-2">
                  <Logo className="h-8 w-8" />
                  <span className="truncate text-sm font-semibold text-ink">
                    My English Journey
                  </span>
                </div>
                <button
                  onClick={onMobileClose}
                  className="rounded-xl p-2 text-[var(--nav-text)] hover:bg-[var(--nav-hover-bg)] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Cerrar menú"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative z-10 flex flex-1 flex-col gap-4">
                <ThemeToggle block />
                <NavLinks collapsed={false} onNavigate={onMobileClose} />
                <div className="border-t border-[var(--sidebar-border)] pt-3">
                  <SignOutButton collapsed={false} onDone={onMobileClose} />
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
