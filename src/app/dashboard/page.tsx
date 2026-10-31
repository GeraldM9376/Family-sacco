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

  // Personalized Greeting Logic
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user.fullName.split(" ")[0];
  
  // Proud Status Message
  const totalDebt = normalTotal + emergencyTotal;
  let statusMessage = "";
  let statusColor = "";
  
  if (totalDebt === 0 && user.savingsTotal > 1000) {
    statusMessage = "You are completely debt-free and saving well! Incredible work.";
    statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  } else if (totalDebt === 0) {
    statusMessage = "You have no active loans. Keep building your savings!";
    statusColor = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
  } else {
    statusMessage = "You have active loans. Every payment brings you closer to freedom.";
    statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Personalized Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            {greeting}, <span className="text-indigo-400">{firstName}</span>!
          </h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm text-slate-400">
            <p>Member ID: <span className="text-slate-200 font-mono">{user.idNumber}</span></p>
            <p>Phone: <span className="text-slate-200">{user.phone}</span></p>
            <p>Joined: <span className="text-slate-200">{fmtDate(user.createdAt)}</span></p>
          </div>
        </div>
        <Link href="/dashboard/pay" className="rounded-xl bg-indigo-600 px-6 py-3 text-center font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 hover:scale-[1.02] transition-all">
          Make a Payment
        </Link>
      </div>

      {/* Proud Status Banner */}
      <div className={`rounded-2xl border p-4 flex items-center gap-3 ${statusColor}`}>
        <div className="text-2xl">
          {totalDebt === 0 ? "🏆" : "🎯"}
        </div>
        <p className="font-semibold">{statusMessage}</p>
      </div>

      {/* Monthly Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-800/50 p-6 shadow-sm border border-slate-700/50 flex flex-col justify-center">
          <p className="text-sm font-medium text-slate-400">Saved in {currentMonthName}</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">{fmt(monthSavings)}</p>
        </div>
        <div className="rounded-2xl bg-slate-800/50 p-6 shadow-sm border border-slate-700/50 flex flex-col justify-center">
          <p className="text-sm font-medium text-slate-400">Loans Paid in {currentMonthName}</p>
          <p className="text-3xl font-bold text-indigo-400 mt-1">{fmt(monthLoansPaid)}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-lg flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 text-8xl">📈</div>
          <p className="text-sm font-medium text-indigo-200">Total Savings Balance</p>
          <p className="text-3xl font-bold mt-1">{fmt(user.savingsTotal)}</p>
        </div>
      </div>

      {/* Progress Cards */}
      <h2 className="text-xl font-bold text-white mt-8 mb-4">Financial Progress</h2>
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Savings Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 p-6 text-white shadow-xl">
          <div className="absolute -right-4 -top-4 text-8xl opacity-10">💰</div>
          <p className="text-sm font-medium opacity-90">Savings Goal</p>
          <p className="mt-2 text-4xl font-extrabold">{fmt(user.savingsTotal)}</p>
          <div className="mt-6">
            <div className="flex justify-between text-xs mb-1 opacity-90">
              <span>Target: KES 350</span>
              <span>{Math.round(savingsPct(user.savingsTotal))}%</span>
            </div>
            <Bar pct={savingsPct(user.savingsTotal)} color="emerald" />
          </div>
        </div>

        {/* Normal Loan Card */}
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

        {/* Emergency Loan Card */}
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

      {/* Lower Section */}
      <div className="grid gap-6 md:grid-cols-2 mt-8">
        
        <div className="rounded-3xl bg-slate-800 p-6 shadow-lg border border-slate-700">
          <h2 className="mb-4 text-lg font-bold text-white flex items-center gap-2">
            Pending Approvals
            {user.payments.length > 0 && <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">{user.payments.length}</span>}
          </h2>
          {user.payments.length === 0 ? (
            <p className="text-sm text-slate-400">No pending payments. You are all caught up!</p>
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
            <p className="text-sm text-slate-400">You have no active loans. Freedom!</p>
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