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

  // Time-based Greeting (Using EAT based on server time approx)
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user.fullName.split(" ")[0];
  const initial = firstName.charAt(0);

  // Dynamic Proud Status
  const totalDebt = normalTotal + emergencyTotal;
  let statusMessage = "";
  let statusColor = "";
  let statusIcon = "";
  
  if (totalDebt === 0 && user.savingsTotal > 1000) {
    statusMessage = "You are completely debt-free and your savings are growing strong. Amazing work!";
    statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
    statusIcon = "🏆";
  } else if (totalDebt === 0) {
    statusMessage = "You have zero active loans. A clean slate! Keep building your wealth.";
    statusColor = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]";
    statusIcon = "✨";
  } else {
    statusMessage = "You have active loans. Every payment brings you closer to financial freedom.";
    statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]";
    statusIcon = "🎯";
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 border border-slate-700 p-8 shadow-2xl">
        <div className="absolute -right-10 -top-10 text-[150px] opacity-5 select-none pointer-events-none">🌟</div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* User Avatar */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl font-extrabold text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/30">
              {initial}
            </div>
            
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{firstName}</span>!
              </h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm text-slate-400 font-medium">
                <p className="flex items-center gap-1.5"><span className="text-slate-500">🆔</span> {user.idNumber}</p>
                <p className="flex items-center gap-1.5"><span className="text-slate-500">📱</span> {user.phone}</p>
                <p className="flex items-center gap-1.5"><span className="text-slate-500">📅</span> Joined {fmtDate(user.createdAt)}</p>
              </div>
            </div>
          </div>

          <Link 
            href="/dashboard/pay" 
            className="w-full md:w-auto rounded-xl bg-white px-6 py-3.5 text-center font-bold text-slate-900 shadow-xl shadow-white/10 hover:bg-gray-100 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Make a Payment</span>
            <span className="text-lg">→</span>
          </Link>
        </div>
      </div>

      {/* Proud Status Banner */}
      <div className={`rounded-2xl border p-5 flex items-start md:items-center gap-4 backdrop-blur-md transition-all duration-300 ${statusColor}`}>
        <div className="text-3xl">{statusIcon}</div>
        <div>
          <h3 className="font-bold text-lg">Account Status</h3>
          <p className="font-medium opacity-90">{statusMessage}</p>
        </div>
      </div>

      {/* Monthly Snapshot */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl bg-slate-800/40 backdrop-blur-md p-6 shadow-sm border border-slate-700 hover:border-slate-500 transition-colors">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Saved in {currentMonthName}</p>
          <p className="text-3xl font-extrabold text-emerald-400">{fmt(monthSavings)}</p>
        </div>
        <div className="rounded-3xl bg-slate-800/40 backdrop-blur-md p-6 shadow-sm border border-slate-700 hover:border-slate-500 transition-colors">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Loans Paid in {currentMonthName}</p>
          <p className="text-3xl font-extrabold text-indigo-400">{fmt(monthLoansPaid)}</p>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 shadow-xl flex flex-col justify-center relative overflow-hidden hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute right-0 top-0 opacity-10 text-8xl translate-x-4 -translate-y-4">📈</div>
          <p className="text-sm font-semibold text-indigo-200 uppercase tracking-wider mb-2">Total Savings</p>
          <p className="text-3xl font-extrabold text-white">{fmt(user.savingsTotal)}</p>
        </div>
      </div>

      {/* Financial Progress */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-5 flex items-center gap-2">
          Financial Progress
          <span className="h-1 w-12 bg-indigo-500 rounded-full"></span>
        </h2>
        
        <div className="grid gap-6 md:grid-cols-3">
          {/* Savings Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-900 p-6 text-white shadow-xl hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute -right-4 -top-4 text-8xl opacity-10">💰</div>
            <p className="text-sm font-medium opacity-90">Savings Progress</p>
            <p className="mt-2 text-4xl font-extrabold">{fmt(user.savingsTotal)}</p>
            <div className="mt-6">
              <div className="flex justify-between text-xs mb-1.5 opacity-90 font-medium">
                <span>Target: KES 350</span>
                <span>{Math.round(savingsPct(user.savingsTotal))}%</span>
              </div>
              <Bar pct={savingsPct(user.savingsTotal)} color="emerald" />
            </div>
          </div>

          {/* Normal Loan Card */}
          <div className="rounded-3xl bg-slate-800/80 p-6 shadow-lg border border-slate-700 hover:border-slate-500 transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Normal Loan Debt</p>
                <p className={`mt-2 text-3xl font-extrabold ${normalTotal === 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmt(normalTotal)}
                </p>
              </div>
              <div className={`p-3 rounded-2xl ${normalTotal === 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                {normalTotal === 0 ? "✓" : "!"}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
                <span>{normalTotal === 0 ? "Fully Settled" : "Repayment Progress"}</span>
                <span>{Math.round(loanPct(normalTotal, normalOriginal))}%</span>
              </div>
              <Bar pct={loanPct(normalTotal, normalOriginal)} color={loanBarColor(normalTotal) as any} />
            </div>
          </div>

          {/* Emergency Loan Card */}
          <div className="rounded-3xl bg-slate-800/80 p-6 shadow-lg border border-slate-700 hover:border-slate-500 transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Emergency Loan Debt</p>
                <p className={`mt-2 text-3xl font-extrabold ${emergencyTotal === 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmt(emergencyTotal)}
                </p>
              </div>
              <div className={`p-3 rounded-2xl ${emergencyTotal === 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                {emergencyTotal === 0 ? "✓" : "!"}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
                <span>{emergencyTotal === 0 ? "Fully Settled" : "Repayment Progress"}</span>
                <span>{Math.round(loanPct(emergencyTotal, emergencyOriginal))}%</span>
              </div>
              <Bar pct={loanPct(emergencyTotal, emergencyOriginal)} color={loanBarColor(emergencyTotal) as any} />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Lists */}
      <div className="grid gap-6 md:grid-cols-2 mt-8">
        
        {/* Pending Approvals */}
        <div className="rounded-3xl bg-slate-800/50 backdrop-blur-md p-6 shadow-lg border border-slate-700">
          <h2 className="mb-5 text-xl font-bold text-white flex items-center justify-between">
            Pending Approvals
            {user.payments.length > 0 && <span className="bg-amber-500/20 text-amber-400 text-sm px-3 py-1 rounded-full">{user.payments.length}</span>}
          </h2>
          
          {user.payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-4xl mb-3 opacity-50">📭</span>
              <p className="text-slate-400 font-medium">No pending payments. You are all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {user.payments.map((p: any) => {
                const b = JSON.parse(p.breakdown || "{}");
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-2xl bg-amber-500/10 p-4 border border-amber-500/20 hover:bg-amber-500/15 transition-colors">
                    <div>
                      <p className="text-base font-bold text-amber-400">Total: {fmt(p.totalAmount)}</p>
                      <p className="text-xs text-amber-500/80 font-medium mt-0.5">
                        {b.savings > 0 && `Savings: ${fmt(b.savings)} `}
                        {b.normal > 0 && `| Normal: ${fmt(b.normal)} `}
                        {b.emergency > 0 && `| Emergency: ${fmt(b.emergency)}`}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-400 border border-amber-500/30">Pending</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Loans */}
        <div className="rounded-3xl bg-slate-800/50 backdrop-blur-md p-6 shadow-lg border border-slate-700">
          <h2 className="mb-5 text-xl font-bold text-white flex items-center justify-between">
            Upcoming Due Dates
            {user.loans.length > 0 && <span className="bg-red-500/20 text-red-400 text-sm px-3 py-1 rounded-full">{user.loans.length}</span>}
          </h2>
          
          {user.loans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-4xl mb-3 opacity-50">🎉</span>
              <p className="text-slate-400 font-medium">You have no active loans. Freedom!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {user.loans.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between rounded-2xl bg-slate-900 p-4 border border-slate-700 hover:border-slate-600 transition-colors">
                  <div>
                    <p className="text-sm font-bold text-white capitalize flex items-center gap-2">
                      {l.type} Loan
                    </p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Due: {fmtDate(l.dueDate)}</p>
                  </div>
                  <span className="font-extrabold text-red-400 text-lg">{fmt(l.amountToPay - l.paidAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}