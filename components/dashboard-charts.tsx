"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PALETTE = [
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

function fmtCurrency(currency: string, maxFrac = 0) {
  return (v: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: maxFrac,
    }).format(v);
}

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  padding: "10px 14px",
  boxShadow: "var(--shadow-lg)",
  color: "var(--foreground)",
  fontSize: "12px",
};

const axisTickStyle = {
  fill: "var(--muted-foreground)",
  fontSize: 11,
};

export function CategoryDonut({
  data,
  currency,
}: {
  data: { name: string; total: number }[];
  currency: string;
}) {
  const chart = data.map((d) => ({ name: d.name, value: d.total }));
  const fmt = fmtCurrency(currency);

  if (!chart.length) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        No expense data yet.
      </div>
    );
  }

  const total = chart.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="relative h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chart}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={3}
            stroke="var(--surface)"
            strokeWidth={2}
          >
            {chart.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => fmt(Number(value ?? 0))}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Total
        </div>
        <div className="text-xl font-extrabold tabular-nums text-foreground">
          {fmt(total)}
        </div>
      </div>
    </div>
  );
}

export function TrendsArea({
  data,
  currency,
}: {
  data: { key: string; income: number; expense: number }[];
  currency: string;
}) {
  const fmt = fmtCurrency(currency);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="key"
            tick={axisTickStyle}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => fmt(Number(v))}
            tick={axisTickStyle}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            width={68}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [
              fmt(Number(value ?? 0)),
              name === "income" ? "Income" : "Expenses",
            ]}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#10b981"
            strokeWidth={2.5}
            fill="url(#gIncome)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="#f97316"
            strokeWidth={2.5}
            fill="url(#gExpense)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NetWorthBar({
  data,
  currency,
}: {
  data: { key: string; net: number }[];
  currency: string;
}) {
  const fmt = fmtCurrency(currency);

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gNetPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.35} />
            </linearGradient>
            <linearGradient id="gNetNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="key"
            tick={axisTickStyle}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => fmt(Number(v))}
            tick={axisTickStyle}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            width={68}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => fmt(Number(value ?? 0))}
          />
          <Bar dataKey="net" radius={[8, 8, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.net >= 0 ? "url(#gNetPos)" : "url(#gNetNeg)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Backwards compat exports used by the old dashboard
export const CategoryPie = CategoryDonut;
export const TrendsLine = TrendsArea;
