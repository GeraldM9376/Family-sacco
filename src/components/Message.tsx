export function Message({
  text,
  type = "info",
}: {
  text?: string | null;
  type?: "info" | "error" | "success";
}) {
  if (!text) return null;
  const cls = {
    info: "bg-blue-50 text-blue-800 border-blue-200",
    error: "bg-red-50 text-red-800 border-red-200",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  }[type];
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>{text}</div>
  );
}