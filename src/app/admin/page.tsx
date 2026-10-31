import { prisma } from "@/lib/prisma";
import { fmt, fmtDate } from "@/lib/helpers";
import { approvePayment, rejectPayment } from "./actions";
import { connection } from "next/server";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  await connection();

  const resolvedParams = await searchParams;
  const now = new Date();
  
  const currentMonth = resolvedParams.month ? parseInt(resolvedParams.month) : now.getMonth();
  const currentYear = resolvedParams.year ? parseInt(resolvedParams.year) : now.getFullYear();

  const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0) - 3 * 60 * 60 * 1000);
  const endOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999) - 3 * 60 * 60 * 1000);

  const pendingPayments = await prisma.payment.findMany({
    where: { status: "pending" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const users = await prisma.user.findMany({
    include: {
      payments: {
        where: {
          status: "approved",
          paidOn: { gte: startOfMonth, lte: endOfMonth },
        },
      },
      loans: {
        where: { status: "unpaid" },
      },
    },
  });

  let totalMonthlyContribution = 0;
  let unpaidUsers: any[] = [];
  let totalUnpaidAmount = 0;
  let activeLoansList: any[] = [];
  let totalLoanDebt = 0;

  users.forEach((user: any) => {
    let monthlySavings = 0;
    user.payments.forEach((p: any) => {
      try {
        const breakdown = typeof p.breakdown === 'string' ? JSON.parse(p.breakdown) : p.breakdown;
        if (breakdown && breakdown.savings) {
          monthlySavings += Number(breakdown.savings);
        }
      } catch (e) {}
    });

    totalMonthlyContribution += monthlySavings;

    if (monthlySavings < 350) {
      unpaidUsers.push({
        id: user.id,
        fullName: user.fullName,
        idNumber: user.idNumber,
        paid: monthlySavings,
        remaining: 350 - monthlySavings,
      });
      totalUnpaidAmount += (350 - monthlySavings);
    }

    user.loans.forEach((loan: any) => {
      const remaining = loan.amountToPay - loan.paidAmount;
      activeLoansList.push({
        id: loan.id,
        userName: user.fullName,
        idNumber: user.idNumber,
        type: loan.type,
        issuedOn: loan.issuedOn,
        dueDate: loan.dueDate,
        remaining: remaining,
        paid: loan.paidAmount,
      });
      totalLoanDebt += remaining;
    });
  });

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      
      {/* Admin Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border border-indigo-500/30 p-8 shadow-[0_0_40px_rgba(79,70,229,0.15)]">
        <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl select-none pointer-events-none">👑</div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="inline-block bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
              Command Center
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">
              System Overview
            </h1>
            <p className="text-indigo-200 mt-2 font-medium">
              Managing {users.length} members • Reviewing {pendingPayments.length} pending actions
            </p>
          </div>
          
          <form className="flex gap-2 bg-slate-900/80 p-2 rounded-2xl shadow-inner border border-slate-700 backdrop-blur-sm">
            <select name="month" defaultValue={currentMonth} className="rounded-xl border-0 bg-transparent py-2 pl-3 pr-8 text-sm font-bold text-white focus:ring-0">
              {months.map((m, i) => (
                <option key={i} value={i} className="bg-slate-800">{m}</option>
              ))}
            </select>
            <select name="year" defaultValue={currentYear} className="rounded-xl border-0 bg-transparent py-2 pl-3 pr-8 text-sm font-bold text-white focus:ring-0">
              <option value={2024} className="bg-slate-800">2024</option>
              <option value={2025} className="bg-slate-800">2025</option>
              <option value={2026} className="bg-slate-800">2026</option>
            </select>
            <button className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30">
              Generate
            </button>
          </form>
        </div>
      </div>

      {/* Master Financial Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-800 p-6 shadow-xl relative overflow-hidden hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute right-0 top-0 opacity-10 text-8xl translate-x-4 -translate-y-4">💰</div>
          <p className="text-indigo-200 font-semibold text-sm uppercase tracking-wider mb-1">Total Monthly Contributions</p>
          <p className="text-4xl font-extrabold text-white">{fmt(totalMonthlyContribution)}</p>
          <p className="text-xs text-indigo-300 mt-2 font-medium">For {months[currentMonth]} {currentYear}</p>
        </div>

        <div className="rounded-3xl bg-slate-800/80 p-6 shadow-lg border border-slate-700 relative overflow-hidden hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute right-0 top-0 opacity-5 text-8xl translate-x-4 -translate-y-4 text-red-500">⚠️</div>
          <p className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-1">Total Outstanding Loan Debt</p>
          <p className="text-4xl font-extrabold text-red-400">{fmt(totalLoanDebt)}</p>
          <p className="text-xs text-slate-400 mt-2 font-medium">Across {activeLoansList.length} active loans</p>
        </div>

        <div className="rounded-3xl bg-slate-800/80 p-6 shadow-lg border border-slate-700 relative overflow-hidden hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute right-0 top-0 opacity-5 text-8xl translate-x-4 -translate-y-4 text-amber-500">🎯</div>
          <p className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-1">Unpaid Monthly Target (&lt; 350)</p>
          <p className="text-4xl font-extrabold text-amber-400">{fmt(totalUnpaidAmount)}</p>
          <p className="text-xs text-slate-400 mt-2 font-medium">{unpaidUsers.length} members behind target</p>
        </div>
      </div>

      {/* Pending Approvals - Mission Critical */}
      <div className="rounded-3xl bg-slate-800/60 backdrop-blur-md p-1 border border-slate-700 shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent rounded-3xl pointer-events-none"></div>
        
        <div className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              Requires Your Approval
            </h2>
            <span className="bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-bold px-3 py-1 rounded-full">
              {pendingPayments.length} pending
            </span>
          </div>

          {pendingPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-900/50 rounded-2xl border border-slate-700/50">
              <span className="text-5xl mb-3">🛡️</span>
              <p className="text-slate-200 font-bold text-lg">All systems clear.</p>
              <p className="text-slate-400 text-sm">There are no pending payments to review right now.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingPayments.map((p: any) => {
                let breakdown: any = {};
                try { breakdown = typeof p.breakdown === 'string' ? JSON.parse(p.breakdown) : p.breakdown; } catch (e) {}
                
                return (
                  <div key={p.id} className="flex flex-col gap-4 rounded-2xl bg-slate-900 p-5 border border-slate-700 shadow-lg relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-2xl font-extrabold text-white">{fmt(p.totalAmount)}</p>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 uppercase tracking-wider border border-indigo-500/20">
                            {p.method === "admin" ? "Admin Assisted" : "Self Pay"}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-300">
                          <span className="text-indigo-400 font-bold">{p.user.fullName}</span> • ID: {p.user.idNumber}
                        </p>
                      </div>
                      <div className="text-xs text-right text-slate-400">
                        <p>Paid on</p>
                        <p className="font-bold text-slate-200">{fmtDate(p.paidOn)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 text-xs font-bold bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                      {breakdown?.savings > 0 && <span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Savings: {fmt(breakdown.savings)}</span>}
                      {breakdown?.normal > 0 && <span className="text-red-400 bg-red-400/10 px-2 py-1 rounded">Normal: {fmt(breakdown.normal)}</span>}
                      {breakdown?.emergency > 0 && <span className="text-orange-400 bg-orange-400/10 px-2 py-1 rounded">Emergency: {fmt(breakdown.emergency)}</span>}
                    </div>

                    <div className="flex gap-2 mt-2">
                      <form action={async () => {
                        "use server";
                        await approvePayment(p.id);
                      }} className="flex-1">
                        <button className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-900/50">
                          Approve
                        </button>
                      </form>

                      <form action={async (formData) => {
                        "use server";
                        const reason = formData.get("reason") as string;
                        await rejectPayment(p.id, reason);
                      }} className="flex-1 flex gap-2">
                        <input name="reason" placeholder="Reject reason..." required
                          className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors placeholder-slate-400" />
                        <button className="rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/30 transition">
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Reports Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Unpaid Members List */}
        <div className="rounded-3xl bg-slate-800/60 backdrop-blur-md p-6 shadow-lg border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
            <span className="text-amber-400">🔔</span> Members Below 350 Target
          </h2>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {unpaidUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-900/50 rounded-xl border border-slate-700/50">
                <span className="text-3xl mb-2">🎉</span>
                <p className="text-emerald-400 font-bold">100% Compliance!</p>
                <p className="text-sm text-slate-400">All members have hit the 350 minimum.</p>
              </div>
            ) : (
              unpaidUsers.map((u) => (
                <div key={u.id} className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-700 hover:border-amber-500/30 transition-colors">
                  <div>
                    <p className="font-bold text-white">{u.fullName}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{u.idNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-amber-400">- {fmt(u.remaining)}</p>
                    <p className="text-xs text-slate-500">Paid: {fmt(u.paid)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Loans List */}
        <div className="rounded-3xl bg-slate-800/60 backdrop-blur-md p-6 shadow-lg border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
            <span className="text-red-400">💳</span> Active Loan Portfolio
          </h2>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {activeLoansList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-900/50 rounded-xl border border-slate-700/50">
                <span className="text-3xl mb-2">✨</span>
                <p className="text-emerald-400 font-bold">No Active Loans</p>
                <p className="text-sm text-slate-400">The Sacco has 0 outstanding debt.</p>
              </div>
            ) : (
              activeLoansList.map((l) => (
                <div key={l.id} className="bg-slate-900 p-4 rounded-xl border border-slate-700 hover:border-red-500/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-white text-sm">{l.userName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">ID: {l.idNumber} • <span className="uppercase text-indigo-400 font-bold text-[10px] bg-indigo-500/10 px-1.5 py-0.5 rounded">{l.type}</span></p>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-1 rounded border border-amber-500/20">Due {fmtDate(l.dueDate)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-3 bg-slate-800 p-2 rounded-lg">
                    <div><span className="text-slate-400 text-xs">Owed:</span> <span className="font-extrabold text-red-400">{fmt(l.remaining)}</span></div>
                    <div><span className="text-slate-400 text-xs">Paid:</span> <span className="font-bold text-emerald-400">{fmt(l.paid)}</span></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}