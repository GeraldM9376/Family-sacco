import { prisma } from "@/lib/prisma";
import { fmt, fmtDate } from "@/lib/helpers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();

  const resolvedParams = await params;
  
  const user = await prisma.user.findUnique({
    where: { id: resolvedParams.id },
    include: {
      accounts: true,
      payments: { orderBy: { createdAt: "desc" }, include: { account: true } },
      loans: { orderBy: { issuedOn: "desc" }, include: { account: true } },
    },
  });

  if (!user) return notFound();

  // Calculate debt per account
  const accountStats = user.accounts.map((acc) => {
    const accLoans = user.loans.filter((l) => l.accountId === acc.id && l.status === "unpaid");
    const normalDebt = accLoans
      .filter((l) => l.type === "normal")
      .reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);
    const emergencyDebt = accLoans
      .filter((l) => l.type === "emergency")
      .reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);
    return { ...acc, normalDebt, emergencyDebt };
  });

  return (
    <div className="space-y-6 bg-slate-950 min-h-screen p-4 md:p-8">
      <Link href="/admin/users" className="text-sm font-bold text-indigo-400 hover:underline">
        ← Back to Users
      </Link>
      
      <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl border border-slate-800">
        <h1 className="text-3xl font-bold">{user.fullName}</h1>
        <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-300">
          <p><strong className="text-white">ID:</strong> {user.idNumber}</p>
          <p><strong className="text-white">Phone:</strong> {user.phone}</p>
          <p><strong className="text-white">Email:</strong> {user.email}</p>
          <p><strong className="text-white">Joined:</strong> {fmtDate(user.createdAt)}</p>
        </div>
      </div>

      {/* Accounts */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Accounts</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {accountStats.map((acc) => (
            <div key={acc.id} className="rounded-2xl bg-slate-900 p-6 border border-slate-800">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{acc.name}</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{fmt(acc.balance)}</p>
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Normal Debt:</span>
                  <span className={acc.normalDebt > 0 ? "text-red-400 font-bold" : "text-slate-500"}>
                    {fmt(acc.normalDebt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Emergency Debt:</span>
                  <span className={acc.emergencyDebt > 0 ? "text-red-400 font-bold" : "text-slate-500"}>
                    {fmt(acc.emergencyDebt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-900 shadow-sm border border-slate-800 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Loan History</h2>
          <div className="space-y-4">
            {user.loans.length === 0 ? (
              <p className="text-sm text-slate-400">No loans taken.</p>
            ) : (
              user.loans.map((loan: any) => (
                <div key={loan.id} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold capitalize text-white">{loan.type} Loan</span>
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      loan.status === "paid" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {loan.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">Account: {loan.account?.name}</p>
                  <div className="text-sm text-slate-300 grid grid-cols-2 gap-2">
                    <p>Issued: <span className="font-medium text-white">{fmtDate(loan.issuedOn)}</span></p>
                    <p>Due: <span className="font-medium text-white">{fmtDate(loan.dueDate)}</span></p>
                    <p>Total: <span className="font-medium text-white">{fmt(loan.amountToPay)}</span></p>
                    <p>Paid: <span className="font-medium text-white">{fmt(loan.paidAmount)}</span></p>
                    <p>Period: <span className="font-medium text-white">{loan.periodMonths} months</span></p>
                    <p>Monthly: <span className="font-medium text-white">{fmt(loan.monthlyInstallment)}</span></p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 shadow-sm border border-slate-800 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Payment History</h2>
          <div className="space-y-3">
            {user.payments.length === 0 ? (
              <p className="text-sm text-slate-400">No payments recorded.</p>
            ) : (
              user.payments.map((p: any) => {
                let breakdown: any = {};
                try { breakdown = JSON.parse(p.breakdown || "{}"); } catch (e) {}
                return (
                  <div key={p.id} className="flex justify-between items-center rounded-xl bg-slate-800 p-3 border border-slate-700">
                    <div>
                      <p className="font-bold text-white">Total: {fmt(p.totalAmount)}</p>
                      <p className="text-xs text-slate-400">{p.account?.name} • {fmtDate(p.paidOn)}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {breakdown.savings > 0 && `Savings: ${fmt(breakdown.savings)} `}
                        {breakdown.normal > 0 && `| Normal: ${fmt(breakdown.normal)} `}
                        {breakdown.emergency > 0 && `| Emergency: ${fmt(breakdown.emergency)}`}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      p.status === "approved" ? "bg-emerald-500/20 text-emerald-400" :
                      p.status === "pending" ? "bg-amber-500/20 text-amber-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>
                      {p.status.toUpperCase()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}