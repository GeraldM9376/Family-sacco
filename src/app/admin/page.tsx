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

  const activeOtps = await prisma.otp.findMany({
    where: { expiresAt: { gt: new Date() } },
    include: { user: true },
    orderBy: { expiresAt: "asc" },
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage approvals and monitor performance.</p>
        </div>
        
        <form className="flex gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
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

      {/* Active Password Reset Codes */}
      <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/30 overflow-hidden">
        <div className="p-5 border-b border-indigo-500/20 flex justify-between items-center">
          <h2 className="text-lg font-bold text-indigo-300">Active Password Reset Codes</h2>
          <span className="bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-md border border-indigo-500/30">{activeOtps.length} active</span>
        </div>
        <div className="p-5">
          {activeOtps.length === 0 ? (
            <p className="text-slate-400 text-sm">No active reset codes. When a user requests one, it will appear here for 1 hour.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {activeOtps.map((otp: any) => {
                const minutesLeft = Math.floor((new Date(otp.expiresAt).getTime() - Date.now()) / 60000);
                return (
                  <div key={otp.id} className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-indigo-500/20">
                    <div>
                      <p className="font-bold text-white">{otp.user.fullName}</p>
                      <p className="text-xs text-slate-400 font-mono">ID: {otp.user.idNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-mono font-extrabold text-indigo-300 tracking-widest">{otp.code}</p>
                      <p className="text-[10px] text-amber-400 font-bold mt-1">Expires in {minutesLeft} mins</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Master Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Total Contributions</p>
          <p className="text-3xl font-bold text-white">{fmt(totalMonthlyContribution)}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Total Loan Debt</p>
          <p className="text-3xl font-bold text-white">{fmt(totalLoanDebt)}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Unpaid Target</p>
          <p className="text-3xl font-bold text-white">{fmt(totalUnpaidAmount)}</p>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Pending Approvals</h2>
          <span className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-md border border-slate-700">{pendingPayments.length} awaiting</span>
        </div>
        <div className="p-6">
          {pendingPayments.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No pending payments.</p>
          ) : (
            <div className="space-y-4">
              {pendingPayments.map((p: any) => {
                let breakdown: any = {};
                try { breakdown = typeof p.breakdown === 'string' ? JSON.parse(p.breakdown) : p.breakdown; } catch (e) {}
                return (
                  <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-800 p-5 bg-slate-950">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-bold text-white">{fmt(p.totalAmount)}</p>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 uppercase border border-slate-700">{p.account?.name}</span>
                      </div>
                      <p className="text-sm text-slate-400"><span className="text-slate-200">{p.user.fullName}</span> • ID: {p.user.idNumber}</p>
                      <div className="text-xs text-slate-400 mt-1 flex gap-3">
                        {breakdown?.savings > 0 && <span>Savings: {fmt(breakdown.savings)}</span>}
                        {breakdown?.normal > 0 && <span>Normal: {fmt(breakdown.normal)}</span>}
                        {breakdown?.emergency > 0 && <span>Emergency: {fmt(breakdown.emergency)}</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Paid: {fmtDate(p.paidOn)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <form action={async () => { "use server"; await approvePayment(p.id); }}>
                        <button className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-bold text-white hover:bg-indigo-500 transition">Approve</button>
                      </form>
                      <form action={async (formData) => {
                        "use server";
                        const reason = formData.get("reason") as string;
                        await rejectPayment(p.id, reason);
                      }} className="flex gap-2">
                        <input name="reason" placeholder="Reason..." required className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-red-500" />
                        <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/20 transition">Reject</button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-900 border border-slate-800">
          <div className="p-5 border-b border-slate-800"><h2 className="text-sm font-bold text-white">Unpaid (&lt; 350)</h2></div>
          <div className="p-5 space-y-3 max-h-[350px] overflow-y-auto">
            {unpaidUsers.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">All paid up!</p> :
              unpaidUsers.map((u) => (
                <div key={u.id} className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <p className="font-bold text-slate-200 text-sm">{u.fullName}</p>
                    <p className="text-xs text-slate-500">{u.idNumber}</p>
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

        <div className="rounded-2xl bg-slate-900 border border-slate-800">
          <div className="p-5 border-b border-slate-800"><h2 className="text-sm font-bold text-white">Active Loans</h2></div>
          <div className="p-5 space-y-3 max-h-[350px] overflow-y-auto">
            {activeLoansList.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No active loans.</p> :
              activeLoansList.map((l) => (
                <div key={l.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-slate-200 text-sm">{l.userName}</p>
                      <p className="text-xs text-slate-500">ID: {l.idNumber} • {l.type}</p>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-900 text-slate-300 px-2 py-1 rounded border border-slate-800">Due {fmtDate(l.dueDate)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm bg-slate-900 p-2 rounded-lg border border-slate-800">
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