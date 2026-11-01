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

  if (!user) return <p className="text-white p-8">Loading…</p>;

  // Get current UTC time
  const now = new Date();
  
  // Force to East Africa Time (UTC+3)
  const eatTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  const eatHour = eatTime.getUTCHours();
  
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

  // Use EAT hour for accurate greeting
  const greeting = eatHour < 12 ? "Good morning" : eatHour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user.fullName.split(" ")[0];

  const hasActiveLoans = user.loans.length > 0;
  const totalDebt = normalTotal + emergencyTotal;
  
  let statusMessage = "";
  let statusColor = "";
  
  if (!hasActiveLoans && user.savingsTotal > 1000) {
    statusMessage = "You are completely debt-free and your savings are growing strong. Amazing work!";
    statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  } else if (!hasActiveLoans) {
    statusMessage = "You have zero active loans. A clean slate! Keep building your wealth.";
    statusColor = "bg-slate-800 text-slate-300 border-slate-700";
  } else {
    statusMessage = "You have active loans. Every payment brings you closer to financial freedom.";
    statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
  }

  return (
    <div className="space-y-8 pb-12 bg-slate-950 min-h-screen p-4 md:p-8">
      
      {/* Personalized Header with Clear Details */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          {/* Solid White, Highly Readable Greeting */}
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            {greeting}, <span className="text-indigo-400">{firstName}</span>
          </h1>
          
          {/* User Details Badges */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
              <span className="text-slate-400 text-xs font-semibold uppercase">ID</span>
              <span className="text-white font-mono font-bold text-sm">{user.idNumber}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
              <span className="text-slate-400 text-xs font-semibold uppercase">Phone</span>
              <span className="text-white font-semibold text-sm">{user.phone}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
              <span className="text-slate-400 text-xs font-semibold uppercase">Joined</span>
              <span className="text-white font-semibold text-sm">{fmtDate(user.createdAt)}</span>
            </div>
          </div>
        </div>

        <Link 
          href="/dashboard/pay" 
          className="w-full md:w-auto rounded-xl bg-indigo-600 px-6 py-3 text-center font-bold text-white hover:bg-indigo-500 transition shadow-lg"
        >
          Make a Payment
        </Link>
      </div>

      {/* Status Banner */}
      <div className={`rounded-xl border p-4 flex items-center gap-4 ${statusColor}`}>
        <div className="text-2xl">{!hasActiveLoans ? "🏆" : "🎯"}</div>
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

      {/* Progress Cards */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Financial Progress</h2>
        <div className="grid gap-6 md:grid-cols-3">
          
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

          <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Normal Loan Debt</p>
              <div className={`px-2 py-0.5 rounded text-xs font-bold ${normalTotal === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {normalTotal === 0 ? "SETTLED" : "ACTIVE"}
              </div>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-white">{fmt(normalTotal)}</p>
            <div className="mt-6">
              <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
                <span>Repayment Progress</span>
                <span>{Math.round(loanPct(normalTotal, normalOriginal))}%</span>
              </div>
              <Bar pct={loanPct(normalTotal, normalOriginal)} color={loanBarColor(normalTotal) as any} />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Emergency Loan Debt</p>
              <div className={`px-2 py-0.5 rounded text-xs font-bold ${emergencyTotal === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {emergencyTotal === 0 ? "SETTLED" : "ACTIVE"}
              </div>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-white">{fmt(emergencyTotal)}</p>
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
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
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

        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
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