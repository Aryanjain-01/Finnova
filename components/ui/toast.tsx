"use client";

import React from "react";
import { CloseIcon, CheckCircleIcon, XCircleIcon, InfoIcon } from "./icons";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  toast: (t: Omit<Toast, "id">) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

function genId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof (crypto as Crypto).randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const variantBar: Record<ToastVariant, string> = {
  success: "bg-success",
  error: "bg-danger",
  info: "bg-primary",
};

const variantIcon: Record<ToastVariant, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-primary",
};

function VariantIcon({ variant }: { variant: ToastVariant }) {
  const cls = `${variantIcon[variant]} shrink-0`;
  if (variant === "success")
    return <CheckCircleIcon className={cls} width={20} height={20} />;
  if (variant === "error")
    return <XCircleIcon className={cls} width={20} height={20} />;
  return <InfoIcon className={cls} width={20} height={20} />;
}

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const timers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tmr = timers.current.get(id);
    if (tmr) {
      clearTimeout(tmr);
      timers.current.delete(id);
    }
  }, []);

  const toast = React.useCallback(
    (t: Omit<Toast, "id">) => {
      const id = genId();
      const next: Toast = { id, variant: "info", ...t };
      setToasts((prev) => [...prev, next]);
      const handle = setTimeout(() => dismiss(id), 4000);
      timers.current.set(id, handle);
    },
    [dismiss]
  );

  React.useEffect(() => {
    const timersRef = timers.current;
    return () => {
      timersRef.forEach((h) => clearTimeout(h));
      timersRef.clear();
    };
  }, []);

  const value = React.useMemo<ToastContextValue>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-3"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => {
          const v: ToastVariant = t.variant ?? "info";
          return (
            <div
              key={t.id}
              className="glass-strong anim-slide-in-right pointer-events-auto relative flex w-80 items-start gap-3 overflow-hidden rounded-xl border border-border p-4 pr-10 shadow-lg"
              role="status"
            >
              <div
                className={`absolute left-0 top-0 h-full w-[3px] ${variantBar[v]}`}
                aria-hidden="true"
              />
              <VariantIcon variant={v} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">
                  {t.title}
                </div>
                {t.description && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t.description}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-strong hover:text-foreground"
              >
                <CloseIcon width={14} height={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
