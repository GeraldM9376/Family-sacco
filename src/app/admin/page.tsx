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
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-400 mt-1 font-medium">Manage Sacco operations and view financial reports.</p>
        </div>
        
        <form className="flex gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-700 shadow-sm">
          <select name="month" defaultValue={currentMonth} className="rounded-lg border-0 bg-transparent py-2 pl-3 pr-8 text-sm font-semibold text-slate-200 focus:ring-0">
            {months.map((m, i) => (
              <option key={i} value={i} className="bg-slate-900">{m}</option>
            ))}
          </select>
          <select name="year" defaultValue={currentYear} className="rounded-lg border-0 bg-transparent py-2 pl-3 pr-8 text-sm font-semibold text-slate-200 focus:ring-0">
            <option value={2024} className="bg-slate-900">2024</option>
            <option value={2025} className="bg-slate-900">2025</option>
            <option value={2026} className="bg-slate-900">2026</option>
          </select>
          <button className="rounded-lg bg-slate-800 border border-slate-600 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 transition">
            View Report
          </button>
        </form>
      </div>

      {/* Master Financial Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800 shadow-sm">
          <p className="text-slate-400 font-semibold text-sm uppercase tracking-wider mb-2">Total Monthly Contributions</p>
          <p className="text-3xl font-extrabold text-white">{fmt(totalMonthlyContribution)}</p>
          <p className="text-xs text-slate-500 mt-2 font-medium">For {months[currentMonth]} {currentYear}</p>
        </div>

        <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800 shadow-sm">
          <p className="text-slate-400 font-semibold text-sm uppercase tracking-wider mb-2">Outstanding Loan Debt</p>
          <p className="text-3xl font-extrabold text-white">{fmt(totalLoanDebt)}</p>
          <p className="text-xs text-slate-500 mt-2 font-medium">Across {activeLoansList.length} active loans</p>
        </div>

        <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800 shadow-sm">
          <p className="text-slate-400 font-semibold text-sm uppercase tracking-wider mb-2">Unpaid Monthly Target</p>
          <p className="text-3xl font-extrabold text-white">{fmt(totalUnpaidAmount)}</p>
          <p className="text-xs text-slate-500 mt-2 font-medium">{unpaidUsers.length} members below 350</p>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
        <div className="border-b border-slate-800 p-6 flex items-center justify-between bg-slate-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Pending Approvals
          </h2>
          <span className="bg-slate-800 text-slate-300 text-xs font-bold px-3 py-1 rounded-md border border-slate-700">
            {pendingPayments.length} awaiting
          </span>
        </div>

        <div className="p-6">
          {pendingPayments.length === 0 ? (
            <p className="text-slate-400 text-center py-6 font-medium">All caught up. No pending payments to approve.</p>
          ) : (
            <div className="space-y-4">
              {pendingPayments.map((p: any) => {
                let breakdown: any = {};
                try { breakdown = typeof p.breakdown === 'string' ? JSON.parse(p.breakdown) : p.breakdown; } catch (e) {}
                
                return (
                  <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-700 p-5 bg-slate-800/50 hover:bg-slate-800 transition-colors">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-bold text-lg text-white">Total: {fmt(p.totalAmount)}</p>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300 uppercase tracking-wider border border-slate-600">
                          {p.method === "admin" ? "Admin Assisted" : "Self Pay"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">
                        <span className="font-semibold text-slate-200">{p.user.fullName}</span> • ID: {p.user.idNumber}
                      </p>
                      <div className="text-xs text-slate-400 mt-2 flex gap-3">
                        {breakdown?.savings > 0 && <span className="text-emerald-400 font-medium">Savings: {fmt(breakdown.savings)}</span>}
                        {breakdown?.normal > 0 && <span className="text-amber-400 font-medium">Normal: {fmt(breakdown.normal)}</span>}
                        {breakdown?.emergency > 0 && <span className="text-red-400 font-medium">Emergency: {fmt(breakdown.emergency)}</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Paid on {fmtDate(p.paidOn)} by {p.payerName}</p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                      <form action={async () => {
                        "use server";
                        await approvePayment(p.id);
                      }} className="flex-1 md:flex-none">
                        <button className="w-full rounded-lg bg-emerald-600 px-6 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition">
                          Approve
                        </button>
                      </form>

                      <form action={async (formData) => {
                        "use server";
                        const reason = formData.get("reason") as string;
                        await rejectPayment(p.id, reason);
                      }} className="flex-1 md:flex-none flex gap-2">
                        <input name="reason" placeholder="Reason..." required
                          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-red-500 placeholder-slate-500" />
                        <button className="rounded-lg bg-slate-800 border border-slate-600 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition">
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
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-lg font-bold text-white">Monthly Contributions (&lt; 350)</h2>
          </div>
          <div className="p-5 space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {unpaidUsers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Everyone has paid the minimum 350 this month!</p>
            ) : (
              unpaidUsers.map((u) => (
                <div key={u.id} className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
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
            )}
          </div>
        </div>

        {/* Active Loans List */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-lg font-bold text-white">Active Loans Overview</h2>
          </div>
          <div className="p-5 space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {activeLoansList.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No active loans right now.</p>
            ) : (
              activeLoansList.map((l) => (
                <div key={l.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-slate-200 text-sm">{l.userName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">ID: {l.idNumber} • <span className="uppercase text-slate-400 font-bold text-[10px]">{l.type}</span></p>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-600">Due {fmtDate(l.dueDate)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <div><span className="text-slate-500 text-xs">Remaining:</span> <span className="font-bold text-red-400">{fmt(l.remaining)}</span></div>
                    <div><span className="text-slate-500 text-xs">Paid:</span> <span className="font-bold text-emerald-400">{fmt(l.paid)}</span></div>
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