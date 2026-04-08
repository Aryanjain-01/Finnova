export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-emerald-200/70 bg-white/85 p-5 shadow-[0_10px_30px_-20px_rgba(6,95,70,0.55)] backdrop-blur-md dark:border-emerald-900/60 dark:bg-emerald-950/30 ${className}`}
    >
      {title ? (
        <h2 className="mb-4 text-xs font-bold tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
