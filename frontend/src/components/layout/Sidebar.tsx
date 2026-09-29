import { useState } from "react";
import { NavLink } from "react-router-dom";
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

function NavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
            )
          }
        >
          <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
          {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
      ))}
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
        className="hidden shrink-0 flex-col border-r border-zinc-200 bg-white px-3 py-4 dark:border-zinc-800 dark:bg-surface-card-dark md:flex"
      >
        <div className="mb-6 flex items-center gap-2 px-2">
          <Logo className="h-8 w-8" />
          {!collapsed && (
            <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              My English Journey
            </span>
          )}
        </div>

        <NavLinks collapsed={collapsed} />

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center rounded-xl p-2 text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
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
              className="absolute inset-0 bg-black/50"
              onClick={onMobileClose}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute inset-y-0 left-0 flex w-64 max-w-[80vw] flex-col border-r border-zinc-200 bg-white px-3 py-4 dark:border-zinc-800 dark:bg-surface-card-dark"
            >
              <div className="mb-6 flex items-center justify-between gap-2 px-2">
                <div className="flex items-center gap-2">
                  <Logo className="h-8 w-8" />
                  <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    My English Journey
                  </span>
                </div>
                <button
                  onClick={onMobileClose}
                  className="rounded-xl p-2 text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Cerrar menú"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <NavLinks collapsed={false} onNavigate={onMobileClose} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
