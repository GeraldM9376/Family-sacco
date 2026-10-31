import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Bar } from "@/components/Bar";
import { fmt, savingsPct, loanBarColor, loanPct, fmtDate } from "@/lib/helpers";
import Link from "next/link";
import { connection } from "next/server";

export default async function Dashboard() {
  await connection();

  const s = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: (s!.user as any).id },
    include: {
      payments: { where: { status: "pending" }, orderBy: { createdAt: "desc" } },
      loans: { where: { status: "unpaid" }, orderBy: { dueDate: "asc" } },
    },
  });

  if (!user) return <p>Loading…</p>;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const monthlyPayments = await prisma.payment.findMany({
    where: {
      userId: user.id,
      status: "approved",
      paidOn: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  let monthSavings = 0;
  let monthLoansPaid = 0;
  monthlyPayments.forEach((p: any) => {
    const b = JSON.parse(p.breakdown || "{}");
    if (b.savings) monthSavings += b.savings;
    if (b.normal) monthLoansPaid += b.normal;
    if (b.emergency) monthLoansPaid += b.emergency;
  });

  const normalLoans = user.loans.filter((l: any) => l.type === "normal");
  const emergencyLoans = user.loans.filter((l: any) => l.type === "emergency");
  
  const normalTotal = normalLoans.reduce((a: number, l: any) => a + (l.amountToPay - l.paidAmount), 0);
  const emergencyTotal = emergencyLoans.reduce((a: number, l: any) => a + (l.amountToPay - l.paidAmount), 0);
  
  const normalOriginal = normalLoans.reduce((a: number, l: any) => a + l.amountToPay, 0);
  const emergencyOriginal = emergencyLoans.reduce((a: number, l: any) => a + l.amountToPay, 0);

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthName = months[now.getMonth()];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Welcome back, {user.fullName.split(" ")[0]}
          </h1>
          <p className="text-slate-400">Here is your financial overview for {currentMonthName}.</p>
        </div>
        <Link href="/dashboard/pay" className="rounded-xl bg-indigo-600 px-6 py-2.5 text-center font-semibold text-white shadow-md hover:bg-indigo-500 transition">
          Make a Payment
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-800 p-6 shadow-sm border border-slate-700 flex flex-col justify-center">
          <p className="text-sm font-medium text-slate-400">Saved this month</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">{fmt(monthSavings)}</p>
          <p className="text-xs text-slate-500 mt-2">Target: KES 350</p>
        </div>
        <div className="rounded-2xl bg-slate-800 p-6 shadow-sm border border-slate-700 flex flex-col justify-center">
          <p className="text-sm font-medium text-slate-400">Loans Paid this month</p>
          <p className="text-3xl font-bold text-indigo-400 mt-1">{fmt(monthLoansPaid)}</p>
          <p className="text-xs text-slate-500 mt-2">Total repayments made</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-lg flex flex-col justify-center">
          <p className="text-sm font-medium text-indigo-200">Total Active Loans</p>
          <p className="text-3xl font-bold mt-1">{fmt(normalTotal + emergencyTotal)}</p>
          <p className="text-xs text-indigo-200 mt-2">{user.loans.length} active loan(s)</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-xl">
          <div className="absolute -right-4 -top-4 text-8xl opacity-10">💰</div>
          <p className="text-sm font-medium opacity-90">Total Savings Balance</p>
          <p className="mt-2 text-4xl font-extrabold">{fmt(user.savingsTotal)}</p>
          <div className="mt-6">
            <div className="flex justify-between text-xs mb-1 opacity-90">
              <span>Minimum: KES 350</span>
              <span>{Math.round(savingsPct(user.savingsTotal))}%</span>
            </div>
            <Bar pct={savingsPct(user.savingsTotal)} color="emerald" />
          </div>
        </div>

        <div className="rounded-3xl bg-slate-800 p-6 shadow-lg border border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-400">Normal Loan Debt</p>
              <p className={`mt-2 text-3xl font-bold ${normalTotal === 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmt(normalTotal)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${normalTotal === 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
              {normalTotal === 0 ? "✓" : "!"}
            </div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>{normalTotal === 0 ? "Fully Settled" : "Repayment Progress"}</span>
              <span>{Math.round(loanPct(normalTotal, normalOriginal))}%</span>
            </div>
            <Bar pct={loanPct(normalTotal, normalOriginal)} color={loanBarColor(normalTotal) as any} />
          </div>
        </div>

        <div className="rounded-3xl bg-slate-800 p-6 shadow-lg border border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-400">Emergency Loan Debt</p>
              <p className={`mt-2 text-3xl font-bold ${emergencyTotal === 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmt(emergencyTotal)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${emergencyTotal === 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
              {emergencyTotal === 0 ? "✓" : "!"}
            </div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>{emergencyTotal === 0 ? "Fully Settled" : "Repayment Progress"}</span>
              <span>{Math.round(loanPct(emergencyTotal, emergencyOriginal))}%</span>
            </div>
            <Bar pct={loanPct(emergencyTotal, emergencyOriginal)} color={loanBarColor(emergencyTotal) as any} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        
        <div className="rounded-3xl bg-slate-800 p-6 shadow-lg border border-slate-700">
          <h2 className="mb-4 text-lg font-bold text-white">Pending Approvals</h2>
          {user.payments.length === 0 ? (
            <p className="text-sm text-slate-400">No payments waiting for approval.</p>
          ) : (
            <div className="space-y-3">
              {user.payments.map((p: any) => {
                const b = JSON.parse(p.breakdown || "{}");
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-xl bg-amber-500/10 p-4 border border-amber-500/20">
                    <div>
                      <p className="text-sm font-bold text-amber-400">Total: {fmt(p.totalAmount)}</p>
                      <p className="text-xs text-amber-500/80">
                        {b.savings > 0 && `Savings: ${fmt(b.savings)} `}
                        {b.normal > 0 && `| Normal: ${fmt(b.normal)} `}
                        {b.emergency > 0 && `| Emergency: ${fmt(b.emergency)}`}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs font-bold text-amber-400">Pending</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-slate-800 p-6 shadow-lg border border-slate-700">
          <h2 className="mb-4 text-lg font-bold text-white">Upcoming Loan Due Dates</h2>
          {user.loans.length === 0 ? (
            <p className="text-sm text-slate-400">You have no active loans.</p>
          ) : (
            <div className="space-y-3">
              {user.loans.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between rounded-xl bg-slate-900 p-4 border border-slate-700">
                  <div>
                    <p className="text-sm font-bold text-white capitalize">{l.type} Loan</p>
                    <p className="text-xs text-slate-400">Due: {fmtDate(l.dueDate)}</p>
                  </div>
                  <span className="font-semibold text-red-400">{fmt(l.amountToPay - l.paidAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}