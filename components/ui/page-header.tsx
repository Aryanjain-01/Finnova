export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      ) : null}
    </div>
  );
}
