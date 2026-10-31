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
      payments: { orderBy: { createdAt: "desc" } },
      loans: { orderBy: { issuedOn: "desc" } },
    },
  });

  if (!user) return notFound();

  return (
    <div className="space-y-6 text-slate-200">
      <Link href="/admin/users" className="text-sm font-bold text-indigo-400 hover:underline">
        ← Back to Users
      </Link>
      
      <div className="rounded-3xl bg-gradient-to-r from-indigo-900 to-slate-800 p-8 text-white shadow-xl border border-slate-700">
        <h1 className="text-3xl font-bold">{user.fullName}</h1>
        <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-300">
          <p><strong className="text-white">ID:</strong> {user.idNumber}</p>
          <p><strong className="text-white">Phone:</strong> {user.phone}</p>
          <p><strong className="text-white">Email:</strong> {user.email}</p>
          <p><strong className="text-white">Joined:</strong> {fmtDate(user.createdAt)}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-800 p-6 shadow-sm border border-slate-700">
          <p className="text-sm text-slate-400">Total Savings</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{fmt(user.savingsTotal)}</p>
        </div>
        <div className="rounded-2xl bg-slate-800 p-6 shadow-sm border border-slate-700">
          <p className="text-sm text-slate-400">Normal Loan Debt</p>
          <p className={`text-2xl font-bold mt-1 ${user.normalDebt > 0 ? "text-red-400" : "text-slate-500"}`}>
            {fmt(user.normalDebt)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-800 p-6 shadow-sm border border-slate-700">
          <p className="text-sm text-slate-400">Emergency Loan Debt</p>
          <p className={`text-2xl font-bold mt-1 ${user.emergencyDebt > 0 ? "text-red-400" : "text-slate-500"}`}>
            {fmt(user.emergencyDebt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-800 shadow-sm border border-slate-700 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Loan History</h2>
          <div className="space-y-4">
            {user.loans.length === 0 ? (
              <p className="text-sm text-slate-400">No loans taken.</p>
            ) : (
              user.loans.map((loan: any) => (
                <div key={loan.id} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold capitalize text-white">{loan.type} Loan</span>
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      loan.status === "paid" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {loan.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300 grid grid-cols-2 gap-2">
                    <p>Issued: <span className="font-medium text-white">{fmtDate(loan.issuedOn)}</span></p>
                    <p>Due: <span className="font-medium text-white">{fmtDate(loan.dueDate)}</span></p>
                    <p>Amount to Pay: <span className="font-medium text-white">{fmt(loan.amountToPay)}</span></p>
                    <p>Paid so far: <span className="font-medium text-white">{fmt(loan.paidAmount)}</span></p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-800 shadow-sm border border-slate-700 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Payment History</h2>
          <div className="space-y-3">
            {user.payments.length === 0 ? (
              <p className="text-sm text-slate-400">No payments recorded.</p>
            ) : (
              user.payments.map((p: any) => {
                const breakdown = JSON.parse(p.breakdown || "{}");
                return (
                  <div key={p.id} className="flex justify-between items-center rounded-xl bg-slate-900 p-3 border border-slate-700">
                    <div>
                      <p className="font-bold text-white">Total: {fmt(p.totalAmount)}</p>
                      <p className="text-xs text-slate-400">
                        {breakdown.savings > 0 && `Savings: ${fmt(breakdown.savings)} `}
                        {breakdown.normal > 0 && `| Normal: ${fmt(breakdown.normal)} `}
                        {breakdown.emergency > 0 && `| Emergency: ${fmt(breakdown.emergency)}`}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Paid: {fmtDate(p.paidOn)} | Status: {p.status}</p>
                    </div>
                    {p.status === "rejected" && p.rejectReason && (
                      <span className="text-xs text-red-400 max-w-[150px] text-right">Reason: {p.rejectReason}</span>
                    )}
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