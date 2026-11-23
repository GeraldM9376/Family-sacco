import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fmt } from "@/lib/helpers";
import { connection } from "next/server";

export default async function YearHistoryPage() {
  await connection();
  const s = await getServerSession(authOptions);
  const userId = (s!.user as any).id;
  const now = new Date();

  let currentSaccoYearStart = new Date(now.getFullYear(), 11, 1); 
  if (now.getMonth() < 11) currentSaccoYearStart = new Date(now.getFullYear() - 1, 11, 1);
  const currentSaccoYearLabel = currentSaccoYearStart.getFullYear();

  const userWithAccounts = await prisma.user.findUnique({ where: { id: userId }, include: { accounts: true, yearHistories: true } });
  if (!userWithAccounts) return <p className="text-white p-8">Loading…</p>;

  const acc2 = userWithAccounts.accounts.find(a => a.name === "Account 2");
  const closedYears = userWithAccounts.yearHistories.map(y => y.year);
  
  const firstPayment = await prisma.payment.findFirst({ where: { userId, status: "approved" }, orderBy: { paidOn: "asc" } });
  
  if (firstPayment && acc2) {
    let startYear = new Date(firstPayment.paidOn).getFullYear();
    if (new Date(firstPayment.paidOn).getMonth() < 11) startYear -= 1;
    
    for (let y = startYear; y < currentSaccoYearLabel; y++) {
      if (!closedYears.includes(y)) {
        const yearStart = new Date(y, 11, 1);
        const yearEnd = new Date(y + 1, 11, 1);
        const payments = await prisma.payment.findMany({ where: { userId, status: "approved", paidOn: { gte: yearStart, lt: yearEnd } } });
        
        let yearAcc2Total = 0;
        payments.forEach(p => {
          try { const b = JSON.parse(p.breakdown || "{}"); if (b.account2 > 0) yearAcc2Total += Number(b.account2); } catch {}
        });

        await prisma.yearHistory.create({ data: { userId, year: y, account2Total: yearAcc2Total } });

        if (acc2.balance > 0) {
          await prisma.$transaction([
            prisma.account.update({ where: { id: acc2.id }, data: { balance: 0 } }),
            prisma.withdrawal.create({ data: { userId, account2Amt: acc2.balance, totalAmount: acc2.balance, method: "Year End Reset", methodDetails: `Auto-archived for year ${y}`, paidOn: yearEnd, approvedAt: yearEnd, status: "approved" } })
          ]);
          acc2.balance = 0;
        }
      }
    }
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { payments: { where: { status: "approved" }, orderBy: { paidOn: "desc" } }, yearHistories: { orderBy: { year: "asc" } } } });
  if (!user) return <p className="text-white p-8">Loading…</p>;

  const yearHistoryList = user.yearHistories.map(y => ({ year: y.year, total: y.account2Total, isLive: false }));
  const currentYearStart = new Date(currentSaccoYearLabel, 11, 1);
  const currentYearPayments = user.payments.filter(p => new Date(p.paidOn) >= currentYearStart);
  let liveYearTotal = 0;
  currentYearPayments.forEach(p => {
    try { const b = JSON.parse(p.breakdown || "{}"); if (b.account2 > 0) liveYearTotal += Number(b.account2); } catch {}
  });

  yearHistoryList.push({ year: currentSaccoYearLabel, total: liveYearTotal, isLive: true });
  const maxYearTotal = Math.max(...yearHistoryList.map(y => y.total), 1);
  const prevYearData = yearHistoryList.find(y => y.year === currentSaccoYearLabel - 1);
  const previousYearTotal = prevYearData ? prevYearData.total : 0;

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-10 space-y-8">
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight">Year History</h1>
        <p className="text-slate-400 mt-2">Your Account 2 earnings per SACCO year (Dec 1 - Nov 30). The balance resets to zero on December 1st, and a new bar begins.</p>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8">
        <div className="flex items-end gap-8 h-80 pb-4 px-4 overflow-x-auto border-b border-slate-800">
          {yearHistoryList.map((y) => {
            const pct = (y.total / maxYearTotal) * 100;
            let barColor = "bg-slate-700";
            if (y.isLive) barColor = (previousYearTotal > 0 && y.total > previousYearTotal) ? "bg-emerald-500" : "bg-indigo-500";
            else if (y.total > 0) barColor = "bg-slate-500";

            return (
              <div key={y.year} className="flex flex-col items-center justify-end h-full flex-1 min-w-[80px] group relative">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-800 text-white text-sm font-bold px-3 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap z-10 pointer-events-none shadow-xl">{fmt(y.total)}</div>
                <div className="w-full max-w-[60px] bg-slate-800/50 rounded-t-lg relative flex items-end justify-center" style={{ height: '100%' }}>
                  <div className={`w-full rounded-t-lg transition-all duration-700 ${barColor}`} style={{ height: `${Math.max(pct, 2)}%` }} />
                </div>
                <div className="mt-4 text-center">
                  <p className={`text-lg font-bold ${y.isLive ? 'text-white' : 'text-slate-400'}`}>{y.year}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">{y.isLive ? "Current" : "Closed"}</p>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {yearHistoryList.slice().reverse().map(y => (
            <div key={y.year} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-400 mb-1">{y.year} {y.isLive ? "(Live)" : "Total"}</p>
              <p className="text-xl font-bold text-white">{fmt(y.total)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}