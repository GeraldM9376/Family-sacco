import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Bar } from "@/components/Bar";
import { fmt, fmtDate } from "@/lib/helpers";
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
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {greeting}, {firstName}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-sm">
              <span className="text-slate-400 mr-2">ID:</span>
              <span className="text-white font-mono">{user.idNumber}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-sm">
              <span className="text-slate-400 mr-2">Phone:</span>
              <span className="text-white">{user.phone}</span>
            </div>
          </div>
        </div>
        <Link href="/dashboard/pay" className="rounded-xl bg-indigo-600 px-6 py-2.5 font-bold text-white hover:bg-indigo-500 transition">
          Make a Payment
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-8">
        {user.accounts.map((acc: any) => (
          <div key={acc.id} className="rounded-2xl bg-slate-900 p-6 border border-slate-800">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{acc.name}</p>
            <p className="text-3xl font-bold text-white mt-2">{fmt(acc.balance)}</p>
            <p className="text-xs text-slate-500 mt-1">This month: {fmt(monthlyTotals[acc.name] || 0)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-slate-900 border border-indigo-500/30 p-6 mt-6">
        <p className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Grand Total</p>
        <p className="text-4xl font-bold text-white mt-1">{fmt(grandTotal)}</p>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 mt-8">
        <h2 className="text-lg font-bold text-white mb-4">Active Loans</h2>
        {user.loans.length === 0 ? (
          <p className="text-sm text-slate-400">You have no active loans.</p>
        ) : (
          <div className="space-y-4">
            {user.loans.map((loan: any) => {
              const remaining = loan.amountToPay - loan.paidAmount;
              const paidInstallments = Math.floor(loan.paidAmount / loan.monthlyInstallment);
              return (
                <div key={loan.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-white capitalize">{loan.type} Loan</span>
                    <span className="text-red-400 font-bold">{fmt(remaining)} Left</span>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Total Paid</span>
                      <span>{Math.round((loan.paidAmount / loan.amountToPay) * 100)}%</span>
                    </div>
                    <Bar pct={(loan.paidAmount / loan.amountToPay) * 100} color="indigo" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Installments Paid: {paidInstallments} / {loan.periodMonths}</span>
                      <span>{Math.round((paidInstallments / loan.periodMonths) * 100)}%</span>
                    </div>
                    <Bar pct={(paidInstallments / loan.periodMonths) * 100} color="emerald" />
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