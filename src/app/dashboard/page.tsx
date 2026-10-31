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

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user.fullName.split(" ")[0];
  const initial = firstName.charAt(0);

  const totalDebt = normalTotal + emergencyTotal;
  let statusMessage = "";
  let statusColor = "";
  let statusIcon = "";
  
  if (totalDebt === 0 && user.savingsTotal > 1000) {
    statusMessage = "You are completely debt-free and your savings are growing strong. Amazing work!";
    statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    statusIcon = "🏆";
  } else if (totalDebt === 0) {
    statusMessage = "You have zero active loans. A clean slate! Keep building your wealth.";
    statusColor = "bg-slate-800 text-slate-300 border-slate-700";
    statusIcon = "✨";
  } else {
    statusMessage = "You have active loans. Every payment brings you closer to financial freedom.";
    statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    statusIcon = "🎯";
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-2xl font-bold text-white border border-slate-700">
            {initial}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {greeting}, {firstName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-400">
              <p>ID: <span className="text-slate-200 font-mono">{user.idNumber}</span></p>
              <p>Phone: <span className="text-slate-200">{user.phone}</span></p>
              <p>Joined: <span className="text-slate-200">{fmtDate(user.createdAt)}</span></p>
            </div>
          </div>
        </div>

        <Link 
          href="/dashboard/pay" 
          className="w-full md:w-auto rounded-xl bg-white px-6 py-2.5 text-center font-bold text-slate-900 hover:bg-gray-200 transition-colors"
        >
          Make a Payment
        </Link>
      </div>

      {/* Status Banner */}
      <div className={`rounded-xl border p-4 flex items-start md:items-center gap-4 ${statusColor}`}>
        <div className="text-2xl">{statusIcon}</div>
        <p className="font-medium">{statusMessage}</p>
      </div>

      {/* Monthly Snapshot */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800 shadow-sm">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Saved in {currentMonthName}</p>
          <p className="text-3xl font-extrabold text-white">{fmt(monthSavings)}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800 shadow-sm">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Loans Paid in {currentMonthName}</p>
          <p className="text-3xl font-extrabold text-white">{fmt(monthLoansPaid)}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800 shadow-sm">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Savings</p>
          <p className="text-3xl font-extrabold text-white">{fmt(user.savingsTotal)}</p>
        </div>
      </div>

      {/* Financial Progress */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Financial Progress</h2>
        
        <div className="grid gap-6 md:grid-cols-3">
          {/* Savings Card */}
          <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800 shadow-sm">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Savings Progress</p>
            <p className="mt-2 text-3xl font-extrabold text-white mb-6">{fmt(user.savingsTotal)}</p>
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
                <span>Target: KES 350</span>
                <span>{Math.round(savingsPct(user.savingsTotal))}%</span>
              </div>
              <Bar pct={savingsPct(user.savingsTotal)} color="emerald" />
            </div>
          </div>

          {/* Normal Loan Card */}
          <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Normal Loan Debt</p>
              <div className={`px-2 py-0.5 rounded text-xs font-bold ${normalTotal === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {normalTotal === 0 ? "SETTLED" : "ACTIVE"}
              </div>
            </div>
            <p className={`mt-2 text-3xl font-extrabold ${normalTotal === 0 ? "text-white" : "text-white"}`}>
              {fmt(normalTotal)}
            </p>
            <div className="mt-6">
              <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
                <span>Repayment Progress</span>
                <span>{Math.round(loanPct(normalTotal, normalOriginal))}%</span>
              </div>
              <Bar pct={loanPct(normalTotal, normalOriginal)} color={loanBarColor(normalTotal) as any} />
            </div>
          </div>

          {/* Emergency Loan Card */}
          <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Emergency Loan Debt</p>
              <div className={`px-2 py-0.5 rounded text-xs font-bold ${emergencyTotal === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {emergencyTotal === 0 ? "SETTLED" : "ACTIVE"}
              </div>
            </div>
            <p className={`mt-2 text-3xl font-extrabold ${emergencyTotal === 0 ? "text-white" : "text-white"}`}>
              {fmt(emergencyTotal)}
            </p>
            <div className="mt-6">
              <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
                <span>Repayment Progress</span>
                <span>{Math.round(loanPct(emergencyTotal, emergencyOriginal))}%</span>
              </div>
              <Bar pct={loanPct(emergencyTotal, emergencyOriginal)} color={loanBarColor(emergencyTotal) as any} />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Lists */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Pending Approvals */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
          <div className="border-b border-slate-800 p-5 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Pending Approvals</h2>
            {user.payments.length > 0 && <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-md border border-slate-700">{user.payments.length}</span>}
          </div>
          <div className="p-5">
            {user.payments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No pending payments. You are all caught up.</p>
            ) : (
              <div className="space-y-3">
                {user.payments.map((p: any) => {
                  const b = JSON.parse(p.breakdown || "{}");
                  return (
                    <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4 border border-slate-700/50">
                      <div>
                        <p className="text-sm font-bold text-white">Total: {fmt(p.totalAmount)}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {b.savings > 0 && `Savings: ${fmt(b.savings)} `}
                          {b.normal > 0 && `| Normal: ${fmt(b.normal)} `}
                          {b.emergency > 0 && `| Emergency: ${fmt(b.emergency)}`}
                        </p>
                      </div>
                      <span className="rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-amber-400 border border-slate-700 uppercase">Pending</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Active Loans */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
          <div className="border-b border-slate-800 p-5 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Upcoming Due Dates</h2>
            {user.loans.length > 0 && <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-md border border-slate-700">{user.loans.length}</span>}
          </div>
          <div className="p-5">
            {user.loans.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">You have no active loans.</p>
            ) : (
              <div className="space-y-3">
                {user.loans.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4 border border-slate-700/50">
                    <div>
                      <p className="text-sm font-bold text-white capitalize">{l.type} Loan</p>
                      <p className="text-xs text-slate-400 mt-1">Due: {fmtDate(l.dueDate)}</p>
                    </div>
                    <span className="font-bold text-white">{fmt(l.amountToPay - l.paidAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}