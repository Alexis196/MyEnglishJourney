"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { LineChart as LineChartIcon } from "lucide-react";
import type { DashboardSummary } from "@myenglishjourney/shared";

export function WeeklyChart({ data }: { data: DashboardSummary["weeklyProgress"] }) {
  const hasData = data.some((d) => d.minutesStudied > 0);

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-ink">Evolución semanal</h3>
      {!hasData ? (
        <EmptyState
          icon={LineChartIcon}
          title="Todavía no hay datos suficientes"
          description="El gráfico va a mostrar tus minutos estudiados por día a medida que avances."
        />
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="minutesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717A" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#71717A" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7", fontSize: 12 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="minutesStudied"
                name="Minutos estudiados"
                stroke="#2563EB"
                strokeWidth={2}
                fill="url(#minutesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
