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
      payments: { where: { status: "approved" }, orderBy: { paidOn: "desc" } },
      loans: { where: { status: "unpaid" }, orderBy: { dueDate: "asc" } },
      withdrawals: { where: { status: "approved" } },
    },
  });

  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  const adminPhone = setting?.sendMoneyTo || "";

  if (!user) return <p className="text-white p-8">Loading…</p>;

  const now = new Date();
  const eatTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  const eatHour = eatTime.getUTCHours();
  const greeting = eatHour < 12 ? "Good morning" : eatHour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user.fullName.split(" ")[0];

  const currentMonthName = now.toLocaleString('default', { month: 'long' });
  const currentYear = now.getFullYear();

  // --- Status Banner Logic ---
  const hasActiveLoans = user.loans.length > 0;
  let statusMessage = "";
  let statusColor = "";
  
  if (!hasActiveLoans && user.accounts.reduce((sum, a) => sum + a.balance, 0) > 1000) {
    statusMessage = "You are completely debt-free and your savings are growing strong. Amazing work!";
    statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  } else if (!hasActiveLoans) {
    statusMessage = "You have zero active loans. A clean slate! Keep building your wealth.";
    statusColor = "bg-slate-800 text-slate-300 border-slate-700";
  } else {
    statusMessage = "You have active loans. Every payment brings you closer to financial freedom.";
    statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
  }

  // --- Monthly Breakdown Logic (SAVINGS ONLY) ---
  const monthlyData: Record<string, { account1: number, account2: number, total: number }> = {};

  user.payments.forEach((p: any) => {
    let breakdown: any = {};
    try { breakdown = JSON.parse(p.breakdown || "{}"); } catch (e) {}

    if (!breakdown.account1 && !breakdown.account2) return;

    const pDate = new Date(p.paidOn);
    const monthKey = `${pDate.toLocaleString('default', { month: 'long' })} ${pDate.getFullYear()}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { account1: 0, account2: 0, total: 0 };
    }

    if (breakdown.account1 > 0) {
      monthlyData[monthKey].account1 += Number(breakdown.account1);
      monthlyData[monthKey].total += Number(breakdown.account1);
    }
    if (breakdown.account2 > 0) {
      monthlyData[monthKey].account2 += Number(breakdown.account2);
      monthlyData[monthKey].total += Number(breakdown.account2);
    }
  });

  const monthlyList = Object.keys(monthlyData).map((key) => ({
    month: key,
    ...monthlyData[key],
  })).sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());

  // --- This Month's Calculations (Resets Monthly) ---
  const thisMonthPayments = user.payments.filter((p: any) => {
    const pDate = new Date(p.paidOn);
    return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
  });
  
  const thisMonthTotals = { account1: 0, account2: 0 };
  thisMonthPayments.forEach((p: any) => {
    let breakdown: any = {};
    try { breakdown = JSON.parse(p.breakdown || "{}"); } catch (e) {}
    if (breakdown.account1 > 0) thisMonthTotals.account1 += Number(breakdown.account1);
    if (breakdown.account2 > 0) thisMonthTotals.account2 += Number(breakdown.account2);
  });

  const thisMonthGrandTotal = thisMonthTotals.account1 + thisMonthTotals.account2;
  const savingsPct = Math.min(100, (thisMonthGrandTotal / 350) * 100);

  // --- All-Time Calculations ---
  const totalSavingsDeposited = monthlyList.reduce((sum, m) => sum + m.total, 0);
  const totalWithdrawn = user.withdrawals.reduce((sum, w) => sum + w.totalAmount, 0);
  const allTimeSavings = totalSavingsDeposited - totalWithdrawn;

  // Grand Total = Current Balances (which already had withdrawals deducted by Admin actions)
  const grandTotal = user.accounts.reduce((sum: number, acc: any) => sum + acc.balance, 0);

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-10 space-y-8">
      {/* Header */}
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
        
        <div className="flex gap-3">
          <Link href="/dashboard/withdraw" className="rounded-lg bg-slate-800 border border-slate-700 px-6 py-2.5 font-semibold text-white hover:bg-slate-700 transition">
            Withdraw
          </Link>
          <Link href="/dashboard/pay" className="rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-500 transition">
            Make a Payment
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-xl border p-4 flex items-center gap-4 ${statusColor}`}>
        <div className="text-2xl">{!hasActiveLoans ? "✓" : "!"}</div>
        <p className="font-medium">{statusMessage}</p>
      </div>

      {/* Account Balances (Current Month) */}
      <div className="grid gap-6 md:grid-cols-2">
        {user.accounts.map((acc: any) => {
          const monthAmount = thisMonthTotals[acc.name === "Account 1" ? "account1" : "account2"];
          return (
            <div key={acc.id} className="rounded-2xl bg-slate-900 p-6 border border-slate-800">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{acc.name} Balance</p>
              <p className="text-4xl font-extrabold text-white mt-2 mb-4">{fmt(acc.balance)}</p>
              
              {/* Detailed Month Badge */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 flex justify-between items-center">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{currentMonthName} {currentYear}</span>
                <span className="text-sm font-bold text-white">{fmt(monthAmount)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grand Total + Savings Progress */}
      <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Current Grand Total Balance</p>
            <p className="text-4xl font-bold text-white mt-2">{fmt(grandTotal)}</p>
          </div>
          <div className="w-full md:w-1/2">
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>{currentMonthName} Savings Progress (Target: 350)</span>
              <span>{Math.round(savingsPct)}%</span>
            </div>
            <Bar pct={savingsPct} color={savingsPct < 30 ? "red" : savingsPct < 70 ? "amber" : "emerald"} />
          </div>
        </div>
      </div>

      {/* MONTHLY BREAKDOWN TABLE (SAVINGS ONLY) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">Monthly Savings Breakdown</h2>
          <p className="text-xs text-slate-500 mt-1">Every month's savings contributions per account.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                <th className="p-5">Month / Year</th>
                <th className="p-5 text-right">Account 1</th>
                <th className="p-5 text-right">Account 2</th>
                <th className="p-5 text-right">Monthly Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {monthlyList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">No savings payments made yet.</td>
                </tr>
              ) : (
                monthlyList.map((m) => (
                  <tr key={m.month} className="hover:bg-slate-800/30 transition">
                    <td className="p-5 font-bold text-white">{m.month}</td>
                    <td className="p-5 text-right text-slate-300">{fmt(m.account1)}</td>
                    <td className="p-5 text-right text-slate-300">{fmt(m.account2)}</td>
                    <td className="p-5 text-right font-bold text-indigo-400">{fmt(m.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-950 border-t border-slate-800">
              <tr>
                <td className="p-5 font-bold text-white">All-Time Savings Total</td>
                <td className="p-5 text-right font-bold text-white">{fmt(monthlyList.reduce((sum, m) => sum + m.account1, 0))}</td>
                <td className="p-5 text-right font-bold text-white">{fmt(monthlyList.reduce((sum, m) => sum + m.account2, 0))}</td>
                <td className="p-5 text-right font-bold text-indigo-400">{fmt(allTimeSavings)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Active Loans */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Active Loans</h2>
        {user.loans.length === 0 ? (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
            <p className="text-sm text-slate-400">You have no active loans.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {user.loans.map((loan: any) => {
              const remaining = loan.amountToPay - loan.paidAmount;
              const progressPct = (loan.paidAmount / loan.amountToPay) * 100;
              const barColor = progressPct < 30 ? "red" : progressPct < 70 ? "amber" : "emerald";

              const issuedDate = new Date(loan.issuedOn);
              const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              const monthsList = [];
              for (let i = 0; i < loan.periodMonths; i++) {
                const d = new Date(issuedDate);
                d.setMonth(d.getMonth() + i);
                monthsList.push(monthNames[d.getMonth()]);
              }

              return (
                <div key={loan.id} className="rounded-2xl bg-slate-900 p-6 border border-slate-800">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="font-bold text-white capitalize">{loan.type} Loan</span>
                      <p className="text-xs text-slate-500 mt-1">Monthly Installment: <span className="text-white">{fmt(loan.monthlyInstallment)}</span></p>
                    </div>
                    <span className="text-sm font-bold text-red-400">{fmt(remaining)} Left</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Total Repayment</span>
                        <span>{Math.round(progressPct)}%</span>
                      </div>
                      <Bar pct={progressPct} color={barColor as any} />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-2 mt-4">
                        <span>Monthly Installments</span>
                      </div>
                      
                      <div className="flex gap-1 w-full h-8">
                        {monthsList.map((m, index) => {
                          const amountPaidTowardsThisMonth = Math.max(0, Math.min(loan.monthlyInstallment, loan.paidAmount - (index * loan.monthlyInstallment)));
                          const monthFillPct = (amountPaidTowardsThisMonth / loan.monthlyInstallment) * 100;
                          
                          const fillColor = index % 2 === 0 ? "bg-indigo-500" : "bg-emerald-500";

                          return (
                            <div 
                              key={index} 
                              className="flex-1 rounded-sm relative bg-slate-800 overflow-hidden"
                              title={`${m}: ${fmt(amountPaidTowardsThisMonth)} / ${fmt(loan.monthlyInstallment)}`}
                            >
                              <div 
                                className={`absolute top-0 left-0 h-full ${fillColor} transition-all duration-500`}
                                style={{ width: `${monthFillPct}%` }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-[10px] font-bold uppercase ${monthFillPct >= 50 ? "text-white" : "text-slate-400"}`}>
                                  {m}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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