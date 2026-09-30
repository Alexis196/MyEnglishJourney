"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Clock, Flame, Rocket, Sparkles } from "lucide-react";
import { useDashboardSummary } from "../../hooks/useDashboardSummary";
import { useAuth } from "../../context/AuthProvider";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { HeroCard } from "../../components/dashboard/HeroCard";
import { StatTile } from "../../components/dashboard/StatTile";
import { RecentErrorsList } from "../../components/dashboard/RecentErrorsList";
import { WeeklyChart } from "../../components/dashboard/WeeklyChart";
import { formatMinutes } from "../../utils/formatDate";
import { useRouter } from "next/navigation";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export function DashboardPage() {
  const { data: summary, isLoading } = useDashboardSummary();
  const { user } = useAuth();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const fullName = user?.user_metadata?.full_name as string | undefined;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!summary || !summary.hasActivePlan) {
    return (
      <EmptyState
        icon={Rocket}
        title="Todavía no tenés un programa activo"
        description="Creá tu plan de 90 días para empezar a recibir clases personalizadas cada día."
        action={
          <Button onClick={() => router.push("/program")} className="mt-2">
            Ver programa
          </Button>
        }
      />
    );
  }

  return (
    <motion.div
      variants={prefersReducedMotion ? undefined : containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-4"
    >
      <motion.div variants={itemVariants}>
        <HeroCard summary={summary} fullName={fullName} />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile icon={Flame} label="Racha actual" value={`${summary.currentStreak} días`} />
        <StatTile icon={Clock} label="Tiempo estudiado" value={formatMinutes(summary.totalMinutesStudied)} tone="secondary" />
        <StatTile icon={Sparkles} label="Palabras aprendidas" value={String(summary.wordsLearnedCount)} />
        <StatTile
          icon={Flame}
          label="Mejor racha"
          value={`${summary.longestStreak} días`}
          tone="secondary"
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WeeklyChart data={summary.weeklyProgress} />
        <RecentErrorsList errors={summary.recentErrors} />
      </motion.div>
    </motion.div>
  );
}
