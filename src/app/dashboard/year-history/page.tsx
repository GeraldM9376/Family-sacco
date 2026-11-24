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
  if (now.getMonth() < 11) { 
    currentSaccoYearStart = new Date(now.getFullYear() - 1, 11, 1);
  }
  
  const currentSaccoYearLabel = currentSaccoYearStart.getFullYear() + 1; 

  const userWithAccounts = await prisma.user.findUnique({ where: { id: userId }, include: { accounts: true, yearHistories: true } });
  if (!userWithAccounts) return <p className="text-white p-8">Loading…</p>;

  const acc2 = userWithAccounts.accounts.find(a => a.name === "Account 2");
  const closedYears = userWithAccounts.yearHistories.map(y => y.year);
  
  const firstPayment = await prisma.payment.findFirst({ where: { userId, status: "approved" }, orderBy: { paidOn: "asc" } });
  
  if (firstPayment && acc2) {
    let startYear = new Date(firstPayment.paidOn).getFullYear();
    if (new Date(firstPayment.paidOn).getMonth() >= 11) startYear += 1;
    
    for (let y = startYear; y < currentSaccoYearLabel; y++) {
      if (!closedYears.includes(y)) {
        const cycleStart = new Date(y - 1, 11, 1);
        const cycleEnd = new Date(y, 11, 1);
        
        const payments = await prisma.payment.findMany({ where: { userId, status: "approved", paidOn: { gte: cycleStart, lt: cycleEnd } } });
        
        let yearAcc2Total = 0;
        payments.forEach(p => {
          try { const b = JSON.parse(p.breakdown || "{}"); if (b.account2 > 0) yearAcc2Total += Number(b.account2); } catch {}
        });

        if (yearAcc2Total > 0) {
          await prisma.yearHistory.create({ data: { userId, year: y, account2Total: yearAcc2Total } });

          if (acc2.balance > 0) {
            await prisma.$transaction([
              prisma.account.update({ where: { id: acc2.id }, data: { balance: 0 } }),
              prisma.withdrawal.create({ data: { userId, account2Amt: acc2.balance, totalAmount: acc2.balance, method: "Year End Reset", methodDetails: `Auto-archived for year ${y}`, paidOn: cycleEnd, approvedAt: cycleEnd, status: "approved" } })
            ]);
            acc2.balance = 0;
          }
        }
      }
    }
  }

  const user = await prisma.user.findUnique({ 
    where: { id: userId }, 
    include: { 
      payments: { where: { status: "approved" }, orderBy: { paidOn: "asc" } },
      yearHistories: { orderBy: { year: "asc" } } 
    } 
  });
  if (!user) return <p className="text-white p-8">Loading…</p>;

  const yearHistoryList = user.yearHistories.map(y => ({ year: y.year, total: y.account2Total, isLive: false, payments: [] as any[] }));
  
  const currentYearStart = new Date(currentSaccoYearLabel - 1, 11, 1);
  const currentYearPayments = user.payments.filter(p => new Date(p.paidOn) >= currentYearStart && new Date(p.paidOn) < new Date(currentSaccoYearLabel, 11, 1));
  
  let liveYearTotal = 0;
  const livePayments = [];
  for (const p of currentYearPayments) {
    try { 
      const b = JSON.parse(p.breakdown || "{}"); 
      if (b.account2 > 0) {
        liveYearTotal += Number(b.account2); 
        livePayments.push({ amount: Number(b.account2), date: p.paidOn });
      } 
    } catch {}
  }
  yearHistoryList.push({ year: currentSaccoYearLabel, total: liveYearTotal, isLive: true, payments: livePayments });

  user.payments.forEach(p => {
    try {
      const b = JSON.parse(p.breakdown || "{}");
      if (b.account2 > 0) {
        const pDate = new Date(p.paidOn);
        let pYear = pDate.getFullYear();
        if (pDate.getMonth() >= 11) pYear += 1;
        
        const historyItem = yearHistoryList.find(h => h.year === pYear);
        if (historyItem && !historyItem.isLive) {
          historyItem.payments.push({ amount: Number(b.account2), date: p.paidOn });
        }
      }
    } catch {}
  });

  const maxYearTotal = Math.max(...yearHistoryList.map(y => y.total), 1);
  
  // The colors for the sections inside the bars
  const sectionColors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-10 space-y-8">
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight">Year History</h1>
        <p className="text-slate-400 mt-2">Your Account 2 earnings per SACCO year (Dec 1 - Nov 30).</p>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8">
        
        <div className="flex items-end justify-around gap-4 h-80 pb-4 border-b border-slate-800">
          {yearHistoryList.map((y, index) => {
            const pct = (y.total / maxYearTotal) * 100;

            return (
              <div key={y.year} className="flex flex-col items-center justify-end h-full flex-1 max-w-[140px] group relative">
                
                <div className="w-full bg-slate-800/50 rounded-t-lg relative flex flex-col justify-end" style={{ height: '100%' }}>
                  
                  <div className={`w-full rounded-t-lg transition-all duration-700 flex flex-col-reverse`} style={{ height: `${pct}%` }}>
                    
                    {/* Each payment is now a different color */}
                    {y.payments.map((payment: any, pIndex: number) => {
                      const paymentPct = (payment.amount / y.total) * 100;
                      const blockColor = sectionColors[pIndex % sectionColors.length];
                      
                      return (
                        <div 
                          key={pIndex} 
                          className={`w-full border-t border-slate-900/30 hover:brightness-125 transition-all relative group/block ${blockColor}`}
                          style={{ height: `${paymentPct}%` }}
                        >
                          <div className="absolute opacity-0 group-hover/block:opacity-100 transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-950 text-white text-xs px-2 py-1 rounded shadow-xl border border-slate-700 whitespace-nowrap z-50 pointer-events-none">
                            + {fmt(payment.amount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <p className={`text-lg font-bold ${y.isLive ? 'text-white' : 'text-slate-400'}`}>{y.year}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">{y.isLive ? "Current" : "Closed"}</p>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-around gap-4 mt-8">
          {yearHistoryList.map((y, index) => {
            let textColor = y.isLive ? "text-indigo-400" : "text-slate-300";
            return (
              <div key={y.year} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 flex-1 max-w-[140px] min-w-[100px]">
                <p className="text-xs text-slate-400 mb-1">{y.year} {y.isLive ? "(Live)" : "Total"}</p>
                <p className={`text-lg md:text-xl font-bold ${textColor} whitespace-nowrap`}>{fmt(y.total)}</p>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}