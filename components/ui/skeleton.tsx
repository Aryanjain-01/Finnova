export function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return <div className={`anim-shimmer rounded-lg ${className}`.trim()} />;
}
