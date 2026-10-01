"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, BookOpen, User, ChevronLeft, ChevronRight, Mic, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { Logo } from "../ui/Logo";

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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/sidebar-london.webp"
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover object-[35%_bottom] [mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.55)_35%,black_75%)]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0D14] via-transparent to-[#0A0D14]/30" />
    </div>
  );
}

function NavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
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
              "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              collapsed && "justify-center px-0",
              isActive
                ? "border-primary/25 bg-primary/[0.14] text-ink shadow-[inset_0_0_0_1px_rgba(52,120,246,0.06)]"
                : "border-transparent text-[#9299AA] hover:bg-white/[0.05] hover:text-ink",
            )}
          >
            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0 transition-colors",
                isActive ? "text-primary" : "group-hover:text-ink",
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

export function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen: boolean; onMobileClose: () => void }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 76 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="relative isolate hidden shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-[#0A0D14] px-3 py-4 md:flex"
      >
        {/* The skyline is skipped in the collapsed rail, where it would only add noise. */}
        {!collapsed && <SidebarScenery />}

        <div className={cn("relative z-10 mb-6 flex items-center gap-2 px-2", collapsed && "justify-center px-0")}>
          <Logo className="h-8 w-8" />
          {!collapsed && <span className="truncate text-sm font-semibold text-ink">My English Journey</span>}
        </div>

        <div className="relative z-10 flex-1">
          <NavLinks collapsed={collapsed} />
        </div>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="relative z-10 flex items-center justify-center rounded-xl bg-[#0A0D14]/60 p-2 text-[#9299AA] backdrop-blur-sm transition-colors hover:bg-white/[0.08] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
          title={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
              onClick={onMobileClose}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute inset-y-0 left-0 isolate flex w-64 max-w-[80vw] flex-col overflow-hidden border-r border-white/[0.06] bg-[#0A0D14] px-3 py-4 shadow-soft-dark"
            >
              <SidebarScenery />

              <div className="relative z-10 mb-6 flex items-center justify-between gap-2 px-2">
                <div className="flex items-center gap-2">
                  <Logo className="h-8 w-8" />
                  <span className="truncate text-sm font-semibold text-ink">My English Journey</span>
                </div>
                <button
                  onClick={onMobileClose}
                  className="rounded-xl p-2 text-[#9299AA] hover:bg-white/[0.08] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Cerrar menú"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative z-10">
                <NavLinks collapsed={false} onNavigate={onMobileClose} />
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
