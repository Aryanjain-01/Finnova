"use client";

import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f97316", "#a855f7", "#ec4899", "#64748b"];

export function CategoryPie({
  data,
  currency,
}: {
  data: { name: string; total: number }[];
  currency: string;
}) {
  const chart = data.map((d) => ({ name: d.name, value: d.total }));
  if (!chart.length) {
    return (
      <p className="text-sm text-zinc-500">No expense data for this month yet.</p>
    );
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chart}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label
          >
            {chart.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) =>
              new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
                Number(value ?? 0),
              )
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendsLine({
  data,
  currency,
}: {
  data: { key: string; income: number; expense: number }[];
  currency: string;
}) {
  const fmt = (v: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(
      v,
    );
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="key" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => fmt(Number(v))} width={64} tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(value, name) => [
              fmt(Number(value ?? 0)),
              name === "income" ? "Income" : "Expenses",
            ]}
          />
          <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="expense" stroke="#f97316" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
