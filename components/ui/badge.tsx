import React from "react";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

type BadgeProps = {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-muted text-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning",
  danger: "bg-danger/15 text-danger",
  info: "bg-primary-soft text-primary",
  outline: "border border-border text-muted-foreground",
};

export function Badge({
  variant = "default",
  children,
  className = "",
  icon,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${variantClasses[variant]} ${className}`.trim()}
    >
      {icon && <span className="inline-flex items-center">{icon}</span>}
      {children}
    </span>
  );
}
