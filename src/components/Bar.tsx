export function Bar({
  pct,
  color = "indigo",
}: {
  pct: number;
  color?: "indigo" | "emerald" | "red" | "amber";
}) {
  const colors = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    red: "bg-red-500",
    amber: "bg-amber-500",
  };
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
      <div
        className={`h-full rounded-full transition-all duration-700 ${colors[color]}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}