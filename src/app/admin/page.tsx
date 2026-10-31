import { prisma } from "@/lib/prisma";
import { fmt, fmtDate } from "@/lib/helpers";
import { approvePayment, rejectPayment } from "./actions";
import { connection } from "next/server";
import { SubmitButton } from "@/components/SubmitButton"; // Added

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
      } catch (e) {
        console.error("Parse error", p.breakdown);
      }
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
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Admin Master Dashboard</h1>
          <p className="text-gray-500">Manage approvals and view monthly Sacco reports.</p>
        </div>
        
        <form className="flex gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
          <select name="month" defaultValue={currentMonth} className="rounded-lg border-0 bg-transparent py-2 pl-3 pr-8 text-sm font-semibold text-gray-700 focus:ring-0">
            {months.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select name="year" defaultValue={currentYear} className="rounded-lg border-0 bg-transparent py-2 pl-3 pr-8 text-sm font-semibold text-gray-700 focus:ring-0">
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
          <SubmitButton className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
            View Report
          </SubmitButton>
        </form>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          Pending Approvals
          <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full">{pendingPayments.length}</span>
        </h2>

        {pendingPayments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No pending payments to approve.</p>
        ) : (
          <div className="space-y-4">
            {pendingPayments.map((p: any) => {
              let breakdown: any = {};
              try { breakdown = typeof p.breakdown === 'string' ? JSON.parse(p.breakdown) : p.breakdown; } catch (e) {}
              
              return (
                <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-gray-200 p-5 bg-gray-50">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-bold text-gray-900">Total: {fmt(p.totalAmount)}</p>
                      <span className="px-2 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-700 uppercase">
                        {p.method === "admin" ? "Admin Pays" : "Self Pay"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">{p.user.fullName}</span> (ID: {p.user.idNumber})
                    </p>
                    <div className="text-xs text-gray-500 mt-2 flex gap-3">
                      {breakdown?.savings > 0 && <span>Savings: {fmt(breakdown.savings)}</span>}
                      {breakdown?.normal > 0 && <span>Normal: {fmt(breakdown.normal)}</span>}
                      {breakdown?.emergency > 0 && <span>Emergency: {fmt(breakdown.emergency)}</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Paid on {fmtDate(p.paidOn)} by {p.payerName}</p>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <form action={async () => {
                      "use server";
                      await approvePayment(p.id);
                    }} className="flex-1 md:flex-none">
                      <SubmitButton className="w-full rounded-xl bg-emerald-500 px-6 py-2 text-sm font-bold text-white hover:bg-emerald-600 transition">
                        Approve
                      </SubmitButton>
                    </form>

                    <form action={async (formData) => {
                      "use server";
                      const reason = formData.get("reason") as string;
                      await rejectPayment(p.id, reason);
                    }} className="flex-1 md:flex-none flex gap-2">
                      <input name="reason" placeholder="Reason..." required
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-500" />
                      <SubmitButton className="rounded-xl bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200 transition">
                        Reject
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-lg border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Monthly Contributions (&lt; 350)</h2>
          <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-2">
            {unpaidUsers.length === 0 ? (
              <p className="text-sm text-emerald-600 font-medium">Everyone has paid the minimum 350 this month!</p>
            ) : (
              unpaidUsers.map((u) => (
                <div key={u.id} className="flex justify-between items-center bg-red-50 p-3 rounded-xl border border-red-100">
                  <div>
                    <p className="font-bold text-gray-900">{u.fullName}</p>
                    <p className="text-xs text-gray-500">ID: {u.idNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">- {fmt(u.remaining)}</p>
                    <p className="text-xs text-gray-500">Paid: {fmt(u.paid)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
            <span className="font-bold text-gray-700">Total Unpaid:</span>
            <span className="text-lg font-extrabold text-red-600">{fmt(totalUnpaidAmount)}</span>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-lg border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Active Loans Overview</h2>
          <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-2">
            {activeLoansList.length === 0 ? (
              <p className="text-sm text-gray-500">No active loans right now.</p>
            ) : (
              activeLoansList.map((l) => (
                <div key={l.id} className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{l.userName}</p>
                      <p className="text-xs text-gray-500">ID: {l.idNumber} | <span className="capitalize text-indigo-600">{l.type}</span></p>
                    </div>
                    <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded">Due {fmtDate(l.dueDate)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                    <div><span className="text-gray-500">Remaining:</span> <span className="font-bold text-red-600">{fmt(l.remaining)}</span></div>
                    <div><span className="text-gray-500">Paid:</span> <span className="font-bold text-emerald-600">{fmt(l.paid)}</span></div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
            <span className="font-bold text-gray-700">Total Loan Debt:</span>
            <span className="text-lg font-extrabold text-red-600">{fmt(totalLoanDebt)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-xl flex justify-between items-center">
        <div>
          <p className="text-indigo-100 font-medium">Total Monthly Contribution (Users &ge; 350)</p>
          <p className="text-sm text-indigo-200 mt-1">For {months[currentMonth]} {currentYear}</p>
        </div>
        <p className="text-4xl font-extrabold">{fmt(totalMonthlyContribution)}</p>
      </div>
    </div>
  );
}