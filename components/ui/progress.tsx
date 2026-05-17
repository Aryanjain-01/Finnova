type ProgressVariant = "default" | "success" | "warning" | "danger";

type ProgressProps = {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
};

const fillClasses: Record<ProgressVariant, string> = {
  default: "gradient-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function Progress({
  value,
  max = 100,
  variant = "default",
  showLabel = false,
  animated = false,
  className = "",
}: ProgressProps) {
  const safeMax = max <= 0 ? 100 : max;
  const raw = (value / safeMax) * 100;
  const pct = Math.max(0, Math.min(100, raw));

  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span className="font-semibold tabular-nums text-foreground">
            {pct.toFixed(0)}%
          </span>
        </div>
      )}
      <div
        className="relative h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
      >
        <div
          className={`relative h-full rounded-full ${fillClasses[variant]}`}
          style={{
            width: `${pct}%`,
            transition: "width 600ms var(--ease-spring)",
          }}
        >
          {animated && (
            <div
              className="anim-shimmer absolute inset-0 rounded-full"
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </div>
  );
}
