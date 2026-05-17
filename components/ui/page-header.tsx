import React from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  eyebrow?: string;
};

export function PageHeader({
  title,
  description,
  icon,
  action,
  eyebrow,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="anim-fade-in mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            {eyebrow}
          </div>
        )}
        <div className="flex items-center gap-3">
          {icon && (
            <div className="anim-scale-in flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              {icon}
            </div>
          )}
          <h1 className="anim-fade-up text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            <span className="gradient-text">{title}</span>
          </h1>
        </div>
        <div className="anim-fade-up anim-delay-1 mt-3 h-1 w-12 rounded-full gradient-primary" />
        {description && (
          <p className="anim-fade-up anim-delay-2 mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="anim-fade-in anim-delay-1 flex shrink-0 flex-row items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
