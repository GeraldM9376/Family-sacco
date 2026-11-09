import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fmt, fmtDate } from "@/lib/helpers";
import Link from "next/link";
import { connection } from "next/server";

export default async function MyLoansPage() {
  await connection();
  const s = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: (s!.user as any).id },
    include: { loans: { orderBy: { issuedOn: "desc" } }, accounts: true },
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">My Loans</h1>
          <p className="text-slate-400 mt-1">Track your active loans and installments.</p>
        </div>
        <Link href="/dashboard" className="rounded-xl bg-slate-800 px-6 py-2.5 font-semibold text-white hover:bg-slate-700 transition">Back</Link>
      </div>

      {user.loans.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-10 text-center shadow-lg">
          <div className="text-4xl mb-4">📄</div>
          <h2 className="text-xl font-bold text-white mb-2">No Active Loans</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            You currently do not have any active loans. If you need financial assistance, you can request a loan from the Admin.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {user.loans.map((loan: any) => {
            const remaining = loan.amountToPay - loan.paidAmount;
            const paidInstallments = Math.floor(loan.paidAmount / loan.monthlyInstallment);
            const accountName = user.accounts.find((a: any) => a.id === loan.accountId)?.name;
            return (
              <div key={loan.id} className="rounded-3xl bg-slate-900 p-6 border border-slate-800 shadow-lg">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="font-bold text-xl text-white capitalize">{loan.type} Loan</span>
                    <p className="text-xs text-slate-500 mt-1">Account: {accountName}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${loan.status === "paid" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {loan.status === "paid" ? "Fully Paid" : "Active"}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-500">Issued</p>
                    <p className="font-semibold text-white">{fmt(loan.principal)}</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-500">Total Due</p>
                    <p className="font-semibold text-white">{fmt(loan.amountToPay)}</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-500">Paid</p>
                    <p className="font-semibold text-emerald-400">{fmt(loan.paidAmount)}</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-500">Remaining</p>
                    <p className="font-semibold text-red-400">{fmt(remaining)}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>Total Repayment</span>
                      <span>{Math.round((loan.paidAmount / loan.amountToPay) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (loan.paidAmount / loan.amountToPay) * 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>Installments ({paidInstallments}/{loan.periodMonths})</span>
                      <span>{Math.round((paidInstallments / loan.periodMonths) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (paidInstallments / loan.periodMonths) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}