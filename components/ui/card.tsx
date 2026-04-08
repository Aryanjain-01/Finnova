import React from "react";

type CardVariant = "default" | "elevated" | "outline" | "gradient";
type CardPadding = "none" | "sm" | "md" | "lg";

type CardProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
  interactive?: boolean;
  padding?: CardPadding;
};

const variantClasses: Record<CardVariant, string> = {
  default: "glass rounded-2xl",
  elevated: "bg-surface-elevated rounded-2xl shadow-lg border border-border",
  outline: "border border-border-strong bg-transparent rounded-2xl",
  gradient: "gradient-primary text-white rounded-2xl shadow-lg",
};

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  title,
  subtitle,
  action,
  icon,
  variant = "default",
  className = "",
  children,
  interactive = false,
  padding = "md",
}: CardProps) {
  const hasHeader = Boolean(title || subtitle || action || icon);
  const base = variantClasses[variant];
  const pad = paddingClasses[padding];
  const lift = interactive ? "hover-lift cursor-pointer" : "";

  return (
    <div
      className={`anim-fade-up ${base} ${pad} ${lift} ${className}`.trim()}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div
                className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${
                  variant === "gradient"
                    ? "bg-white/15 text-white"
                    : "bg-primary-soft text-primary"
                }`}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <div
                  className={`text-base font-semibold leading-tight truncate ${
                    variant === "gradient" ? "text-white" : "text-foreground"
                  }`}
                >
                  {title}
                </div>
              )}
              {subtitle && (
                <div
                  className={`text-sm mt-1 ${
                    variant === "gradient"
                      ? "text-white/80"
                      : "text-muted-foreground"
                  }`}
                >
                  {subtitle}
                </div>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export function CardGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid gap-5 md:gap-6 sm:grid-cols-2 lg:grid-cols-3 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
