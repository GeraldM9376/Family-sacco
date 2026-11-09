import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Bar } from "@/components/Bar";
import { fmt } from "@/lib/helpers";
import Link from "next/link";
import { connection } from "next/server";

export default async function Dashboard() {
  await connection();

  const s = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: (s!.user as any).id },
    include: {
      accounts: true,
      payments: { where: { status: "pending" }, orderBy: { createdAt: "desc" } },
      loans: { where: { status: "unpaid" }, orderBy: { dueDate: "asc" } },
    },
  });

  if (!user) return <p className="text-white p-8">Loading…</p>;

  const now = new Date();
  const eatTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  const eatHour = eatTime.getUTCHours();
  const greeting = eatHour < 12 ? "Good morning" : eatHour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user.fullName.split(" ")[0];

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlyTotals: any = { "Account 1": 0, "Account 2": 0 };

  user.payments.forEach((p: any) => {
    const pDate = new Date(p.paidOn);
    if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear && p.status === "approved") {
      const acc = user.accounts.find((a: any) => a.id === p.accountId);
      if (acc) monthlyTotals[acc.name] += p.totalAmount;
    }
  });

  const grandTotal = user.accounts.reduce((sum: number, acc: any) => sum + acc.balance, 0);

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-10 space-y-8">
      {/* Clean Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {greeting}, {firstName}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className="px-3 py-1 bg-slate-900 rounded-md text-xs font-mono text-slate-300 border border-slate-800">
              ID: {user.idNumber}
            </span>
            <span className="px-3 py-1 bg-slate-900 rounded-md text-xs text-slate-300 border border-slate-800">
              Phone: {user.phone}
            </span>
          </div>
        </div>
        <Link href="/dashboard/pay" className="rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-500 transition">
          Make a Payment
        </Link>
      </div>

      {/* Accounts */}
      <div className="grid gap-6 md:grid-cols-2">
        {user.accounts.map((acc: any) => (
          <div key={acc.id} className="rounded-2xl bg-slate-900 p-6 border border-slate-800">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{acc.name}</p>
            <p className="text-3xl font-bold text-white mt-2">{fmt(acc.balance)}</p>
            <p className="text-xs text-slate-500 mt-1">This month: {fmt(monthlyTotals[acc.name] || 0)}</p>
          </div>
        ))}
      </div>

      {/* Grand Total */}
      <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800">
        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Grand Total</p>
        <p className="text-4xl font-bold text-white mt-2">{fmt(grandTotal)}</p>
      </div>

      {/* Loans */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Active Loans</h2>
        {user.loans.length === 0 ? (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
            <p className="text-sm text-slate-400">You have no active loans.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {user.loans.map((loan: any) => {
              const remaining = loan.amountToPay - loan.paidAmount;
              const paidInstallments = Math.floor(loan.paidAmount / loan.monthlyInstallment);
              return (
                <div key={loan.id} className="rounded-2xl bg-slate-900 p-6 border border-slate-800">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="font-bold text-white capitalize">{loan.type} Loan</span>
                      <p className="text-xs text-slate-500 mt-1">Account: {user.accounts.find((a: any) => a.id === loan.accountId)?.name}</p>
                    </div>
                    <span className="text-sm font-bold text-red-400">{fmt(remaining)} Left</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Total Repayment</span><span>{Math.round((loan.paidAmount / loan.amountToPay) * 100)}%</span>
                      </div>
                      <Bar pct={(loan.paidAmount / loan.amountToPay) * 100} color="indigo" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Installments ({paidInstallments}/{loan.periodMonths})</span><span>{Math.round((paidInstallments / loan.periodMonths) * 100)}%</span>
                      </div>
                      <Bar pct={(paidInstallments / loan.periodMonths) * 100} color="emerald" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}