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
    include: { user: true, account: true },
    orderBy: { createdAt: "asc" },
  });

  const users = await prisma.user.findMany({
    include: {
      payments: { where: { status: "approved", paidOn: { gte: startOfMonth, lte: endOfMonth } } },
      loans: { where: { status: "unpaid" } },
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
        if (breakdown && breakdown.savings) monthlySavings += Number(breakdown.savings);
      } catch (e) {}
    });

    totalMonthlyContribution += monthlySavings;

    if (monthlySavings < 350) {
      unpaidUsers.push({ id: user.id, fullName: user.fullName, idNumber: user.idNumber, paid: monthlySavings, remaining: 350 - monthlySavings });
      totalUnpaidAmount += (350 - monthlySavings);
    }

    user.loans.forEach((loan: any) => {
      const remaining = loan.amountToPay - loan.paidAmount;
      activeLoansList.push({ id: loan.id, userName: user.fullName, idNumber: user.idNumber, type: loan.type, dueDate: loan.dueDate, remaining, paid: loan.paidAmount });
      totalLoanDebt += remaining;
    });
  });

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Admin Command Center</h1>
          <p className="text-slate-400 mt-2">Manage approvals and monitor Sacco health.</p>
        </div>
        
        <form className="flex gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 shadow-lg">
          <select name="month" defaultValue={currentMonth} className="rounded-lg border-0 bg-transparent py-2 pl-3 pr-8 text-sm font-semibold text-white focus:ring-0">
            {months.map((m, i) => <option key={i} value={i} className="bg-slate-900">{m}</option>)}
          </select>
          <select name="year" defaultValue={currentYear} className="rounded-lg border-0 bg-transparent py-2 pl-3 pr-8 text-sm font-semibold text-white focus:ring-0">
            <option value={2024} className="bg-slate-900">2024</option>
            <option value={2025} className="bg-slate-900">2025</option>
            <option value={2026} className="bg-slate-900">2026</option>
          </select>
          <button className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-500 transition">Filter</button>
        </form>
      </div>

      {/* Master Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl bg-slate-900 p-8 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 p-6 opacity-5 text-6xl">💵</div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Total Contributions</p>
          <p className="text-4xl font-extrabold text-white">{fmt(totalMonthlyContribution)}</p>
        </div>
        <div className="rounded-3xl bg-slate-900 p-8 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 p-6 opacity-5 text-6xl">⚠️</div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Total Loan Debt</p>
          <p className="text-4xl font-extrabold text-white">{fmt(totalLoanDebt)}</p>
        </div>
        <div className="rounded-3xl bg-slate-900 p-8 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 p-6 opacity-5 text-6xl">🎯</div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Unpaid Target</p>
          <p className="text-4xl font-extrabold text-white">{fmt(totalUnpaidAmount)}</p>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            Pending Approvals
            <span className="bg-indigo-500/20 text-indigo-400 text-xs px-3 py-1 rounded-full border border-indigo-500/30">{pendingPayments.length} action required</span>
          </h2>
        </div>
        <div className="p-6">
          {pendingPayments.length === 0 ? (
            <p className="text-slate-400 text-center py-8">All caught up. No pending payments.</p>
          ) : (
            <div className="space-y-4">
              {pendingPayments.map((p: any) => {
                let breakdown: any = {};
                try { breakdown = typeof p.breakdown === 'string' ? JSON.parse(p.breakdown) : p.breakdown; } catch (e) {}
                return (
                  <div key={p.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-2xl border border-slate-700/50 p-6 bg-slate-800/30">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-extrabold text-2xl text-white">{fmt(p.totalAmount)}</p>
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-700 text-slate-300 uppercase tracking-widest border border-slate-600">
                          {p.account?.name}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">
                        <span className="font-bold text-white">{p.user.fullName}</span> • ID: {p.user.idNumber}
                      </p>
                      <div className="text-xs text-slate-400 mt-2 flex gap-4 bg-slate-900/50 p-2 rounded-lg inline-block">
                        {breakdown?.savings > 0 && <span>Savings: <span className="text-white">{fmt(breakdown.savings)}</span></span>}
                        {breakdown?.normal > 0 && <span>Normal: <span className="text-white">{fmt(breakdown.normal)}</span></span>}
                        {breakdown?.emergency > 0 && <span>Emergency: <span className="text-white">{fmt(breakdown.emergency)}</span></span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Submitted on {fmtDate(p.paidOn)}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                      <form action={async () => { "use server"; await approvePayment(p.id); }} className="w-full sm:w-auto">
                        <button className="w-full rounded-xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20">Approve</button>
                      </form>
                      <form action={async (formData) => {
                        "use server";
                        const reason = formData.get("reason") as string;
                        await rejectPayment(p.id, reason);
                      }} className="flex gap-2 w-full sm:w-auto">
                        <input name="reason" placeholder="Rejection reason..." required className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-red-500 w-full" />
                        <button className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/20 transition whitespace-nowrap">Reject</button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Unpaid List */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="p-6 border-b border-slate-800"><h2 className="text-lg font-bold text-white">Underpaid Members (&lt; 350)</h2></div>
          <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {unpaidUsers.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Everyone has met the minimum!</p> :
              unpaidUsers.map((u) => (
                <div key={u.id} className="flex justify-between items-center bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                  <div>
                    <p className="font-bold text-slate-200 text-sm">{u.fullName}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{u.idNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-400">- {fmt(u.remaining)}</p>
                    <p className="text-xs text-slate-500">Paid: {fmt(u.paid)}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Active Loans List */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="p-6 border-b border-slate-800"><h2 className="text-lg font-bold text-white">Active Loan Portfolio</h2></div>
          <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {activeLoansList.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No active loans.</p> :
              activeLoansList.map((l) => (
                <div key={l.id} className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-slate-200 text-sm">{l.userName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">ID: {l.idNumber} • <span className="uppercase text-slate-400 font-bold text-[10px]">{l.type}</span></p>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">Due {fmtDate(l.dueDate)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div><span className="text-slate-500 text-xs">Left:</span> <span className="font-bold text-red-400">{fmt(l.remaining)}</span></div>
                    <div><span className="text-slate-500 text-xs">Paid:</span> <span className="font-bold text-indigo-400">{fmt(l.paid)}</span></div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}