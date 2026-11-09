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
    include: { accounts: true, payments: { orderBy: { createdAt: "desc" } }, loans: { orderBy: { issuedOn: "desc" } } },
  });

  if (!user) return notFound();
  const allAccounts = await prisma.account.findMany({ where: { userId: user.id } });
  const getAccountName = (accountId: string) => allAccounts.find((a) => a.id === accountId)?.name || "Unknown";

  const accountStats = user.accounts.map((acc) => {
    const accLoans = user.loans.filter((l) => l.accountId === acc.id && l.status === "unpaid");
    const normalDebt = accLoans.filter((l) => l.type === "normal").reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);
    const emergencyDebt = accLoans.filter((l) => l.type === "emergency").reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);
    return { ...acc, normalDebt, emergencyDebt };
  });

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-10 space-y-8">
      <Link href="/admin/users" className="text-sm font-bold text-indigo-400 hover:underline">← Back to Users</Link>
      
      <div className="rounded-3xl bg-slate-900 p-8 border border-slate-800 shadow-xl">
        <h1 className="text-3xl font-extrabold text-white">{user.fullName}</h1>
        <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-400">
          <p>ID: <span className="text-white font-mono">{user.idNumber}</span></p>
          <p>Phone: <span className="text-white">{user.phone}</span></p>
          <p>Email: <span className="text-white">{user.email}</span></p>
          <p>Joined: <span className="text-white">{fmtDate(user.createdAt)}</span></p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {accountStats.map((acc) => (
          <div key={acc.id} className="rounded-3xl bg-slate-900 p-6 border border-slate-800 shadow-lg">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">{acc.name}</p>
            <p className="text-3xl font-extrabold text-white mt-2">{fmt(acc.balance)}</p>
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Normal Debt:</span><span className={acc.normalDebt > 0 ? "text-red-400 font-bold" : "text-slate-600"}>{fmt(acc.normalDebt)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Emergency Debt:</span><span className={acc.emergencyDebt > 0 ? "text-red-400 font-bold" : "text-slate-600"}>{fmt(acc.emergencyDebt)}</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-4">Loan History</h2>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {user.loans.length === 0 ? <p className="text-sm text-slate-400">No loans taken.</p> :
              user.loans.map((loan) => (
                <div key={loan.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold capitalize text-white">{loan.type} Loan</span>
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${loan.status === "paid" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{loan.status.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">Account: {getAccountName(loan.accountId)}</p>
                  <div className="text-sm text-slate-300 grid grid-cols-2 gap-2">
                    <p>Due: <span className="text-white">{fmtDate(loan.dueDate)}</span></p>
                    <p>Total: <span className="text-white">{fmt(loan.amountToPay)}</span></p>
                    <p>Paid: <span className="text-white">{fmt(loan.paidAmount)}</span></p>
                    <p>Installment: <span className="text-white">{fmt(loan.monthlyInstallment)}</span></p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-4">Payment History</h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {user.payments.length === 0 ? <p className="text-sm text-slate-400">No payments recorded.</p> :
              user.payments.map((p) => {
                let breakdown: any = {}; try { breakdown = JSON.parse(p.breakdown || "{}"); } catch (e) {}
                return (
                  <div key={p.id} className="rounded-xl bg-slate-950 p-4 border border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-bold text-white">{fmt(p.totalAmount)}</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : p.status === "pending" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>{p.status.toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-slate-500">{getAccountName(p.accountId)} • {fmtDate(p.paidOn)}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {breakdown.savings > 0 && `Savings: ${fmt(breakdown.savings)} `}
                      {breakdown.normal > 0 && `| Normal: ${fmt(breakdown.normal)} `}
                      {breakdown.emergency > 0 && `| Emergency: ${fmt(breakdown.emergency)}`}
                    </p>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </div>
  );
}