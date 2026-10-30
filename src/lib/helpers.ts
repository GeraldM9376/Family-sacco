export const savingsPct = (total: number) => Math.min(100, (total / 350) * 100);

export const loanBarColor = (debt: number) => (debt <= 0 ? "emerald" : "red");

export const loanPct = (debt: number, original: number) =>
  original <= 0 ? 100 : Math.max(0, 100 - Math.min(100, (debt / original) * 100));

export const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(n);

export const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });