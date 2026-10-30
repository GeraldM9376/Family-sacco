import { prisma } from "@/lib/prisma";
import { fmt, fmtDate } from "@/lib/helpers";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function UserProfilePage({ params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      payments: { orderBy: { createdAt: "desc" } },
      loans: { orderBy: { issuedOn: "desc" } },
    },
  });

  if (!user) return notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="text-sm font-bold text-indigo-600 hover:underline">
        ← Back to Users
      </Link>
      
      {/* User Info Header */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-900 to-gray-900 p-8 text-white shadow-xl">
        <h1 className="text-3xl font-bold">{user.fullName}</h1>
        <div className="mt-4 flex flex-wrap gap-6 text-sm text-indigo-200">
          <p><strong className="text-white">ID:</strong> {user.idNumber}</p>
          <p><strong className="text-white">Phone:</strong> {user.phone}</p>
          <p><strong className="text-white">Email:</strong> {user.email}</p>
          <p><strong className="text-white">Joined:</strong> {fmtDate(user.createdAt)}</p>
        </div>
      </div>

      {/* Balances Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Savings</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{fmt(user.savingsTotal)}</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Normal Loan Debt</p>
          <p className={`text-2xl font-bold mt-1 ${user.normalDebt > 0 ? "text-red-500" : "text-gray-400"}`}>
            {fmt(user.normalDebt)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Emergency Loan Debt</p>
          <p className={`text-2xl font-bold mt-1 ${user.emergencyDebt > 0 ? "text-red-500" : "text-gray-400"}`}>
            {fmt(user.emergencyDebt)}
          </p>
        </div>
      </div>

      {/* Tables for Loans and Transactions */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Loans Table */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Loan History</h2>
          <div className="space-y-4">
            {user.loans.length === 0 ? (
              <p className="text-sm text-gray-500">No loans taken.</p>
            ) : (
              user.loans.map((loan) => (
                <div key={loan.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold capitalize text-gray-800">{loan.type} Loan</span>
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      loan.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>
                      {loan.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                    <p>Issued: <span className="font-medium">{fmtDate(loan.issuedOn)}</span></p>
                    <p>Due: <span className="font-medium">{fmtDate(loan.dueDate)}</span></p>
                    <p>Amount to Pay: <span className="font-medium">{fmt(loan.amountToPay)}</span></p>
                    <p>Paid so far: <span className="font-medium">{fmt(loan.paidAmount)}</span></p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Payment History</h2>
          <div className="space-y-3">
            {user.payments.length === 0 ? (
              <p className="text-sm text-gray-500">No payments recorded.</p>
            ) : (
              user.payments.map((p) => (
                <div key={p.id} className="flex justify-between items-center rounded-xl bg-gray-50 p-3 border border-gray-100">
                  <div>
                    <p className="font-bold text-gray-800 capitalize">{p.type} - {fmt(p.amount)}</p>
                    <p className="text-xs text-gray-500">Paid: {fmtDate(p.paidOn)} | Status: {p.status}</p>
                  </div>
                  {p.status === "rejected" && p.rejectReason && (
                    <span className="text-xs text-red-600 max-w-[150px] text-right">Reason: {p.rejectReason}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}