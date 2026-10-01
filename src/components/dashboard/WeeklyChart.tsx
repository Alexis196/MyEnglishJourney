"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { LineChart as LineChartIcon } from "lucide-react";
import { useTheme } from "../../context/ThemeProvider";
import type { DashboardSummary } from "@myenglishjourney/shared";

export function WeeklyChart({ data }: { data: DashboardSummary["weeklyProgress"] }) {
  const hasData = data.some((d) => d.minutesStudied > 0);
  // Recharts takes plain colours, so pick them from the resolved theme (same hues as the CSS tokens).
  const { resolvedTheme } = useTheme();
  const palette =
    resolvedTheme === "dark"
      ? { line: "#2563EB", from: "#2563EB", to: "#7C3AED", axis: "#71717A" }
      : { line: "#2878F0", from: "#2878F0", to: "#7557E8", axis: "#8A96AA" };

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-ink">Evolución semanal</h3>
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
                  <stop offset="0%" stopColor={palette.from} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={palette.to} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: palette.axis }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: palette.axis }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                  background: "rgb(var(--c-card))",
                  color: "rgb(var(--c-ink))",
                  boxShadow: "var(--shadow-card)",
                  fontSize: 12,
                }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="minutesStudied"
                name="Minutos estudiados"
                stroke={palette.line}
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
