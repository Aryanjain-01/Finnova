import React from "react";

type Accent = "primary" | "success" | "warning" | "danger" | "neutral";

type StatTileProps = {
  label: string;
  value: React.ReactNode;
  delta?: { value: number; label?: string };
  icon?: React.ReactNode;
  accent?: Accent;
  sparkline?: number[];
  className?: string;
};

const accentBar: Record<Accent, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-border-strong",
};

const accentIcon: Record<Accent, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning",
  danger: "bg-danger/15 text-danger",
  neutral: "bg-muted text-muted-foreground",
};

const accentSpark: Record<Accent, string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  neutral: "var(--muted-foreground)",
};

function Sparkline({
  data,
  stroke,
}: {
  data: number[];
  stroke: string;
}) {
  if (!data || data.length < 2) return null;
  const width = 100;
  const height = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      className="overflow-visible"
    >
      <polyline
        points={points}
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeltaPill({ value, label }: { value: number; label?: string }) {
  const positive = value >= 0;
  const color = positive
    ? "bg-success/15 text-success"
    : "bg-danger/15 text-danger";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {positive ? (
          <>
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </>
        ) : (
          <>
            <path d="M12 5v14" />
            <path d="m19 12-7 7-7-7" />
          </>
        )}
      </svg>
      <span className="tabular-nums">
        {positive ? "+" : ""}
        {value.toFixed(1)}%
      </span>
      {label && <span className="opacity-80 normal-case">{label}</span>}
    </span>
  );
}

export function StatTile({
  label,
  value,
  delta,
  icon,
  accent = "primary",
  sparkline,
  className = "",
}: StatTileProps) {
  return (
    <div
      className={`glass anim-fade-up hover-lift relative overflow-hidden rounded-2xl p-5 ${className}`.trim()}
    >
      <div
        className={`absolute left-0 top-0 h-full w-[2px] ${accentBar[accent]}`}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {value}
          </div>
          {delta && (
            <div className="mt-3">
              <DeltaPill value={delta.value} label={delta.label} />
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-3">
          {icon && (
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentIcon[accent]}`}
            >
              {icon}
            </div>
          )}
          {sparkline && sparkline.length > 1 && (
            <Sparkline data={sparkline} stroke={accentSpark[accent]} />
          )}
        </div>
      </div>
    </div>
  );
}
