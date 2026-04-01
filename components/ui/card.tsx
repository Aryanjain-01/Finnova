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
      className={`rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      {title ? <h2 className="mb-4 text-sm font-semibold text-zinc-500">{title}</h2> : null}
      {children}
    </section>
  );
}
