import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fmt, fmtDate } from "@/lib/helpers";
import Link from "next/link";
import { connection } from "next/server";

export default async function HistoryPage() {
  await connection();
  const s = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: (s!.user as any).id },
    include: { payments: { orderBy: { createdAt: "desc" } }, accounts: true },
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Payment History</h1>
          <p className="text-slate-400 mt-1">A full record of all your contributions.</p>
        </div>
        <Link href="/dashboard" className="rounded-xl bg-slate-800 px-6 py-2.5 font-semibold text-white hover:bg-slate-700 transition">Back</Link>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        {/* overflow-x-auto is the magic class that allows scrolling */}
        <div className="overflow-x-auto w-full">
          {/* min-w-[600px] forces the table to stay wide, triggering the scroll */}
          <table className="w-full min-w-[600px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                <th className="p-4 md:p-5 whitespace-nowrap">Date</th>
                <th className="p-4 md:p-5 whitespace-nowrap">Account</th>
                <th className="p-4 md:p-5 whitespace-nowrap">Breakdown</th>
                <th className="p-4 md:p-5 whitespace-nowrap">Amount</th>
                <th className="p-4 md:p-5 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {user.payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No payments recorded yet.</td>
                </tr>
              ) : (
                user.payments.map((p: any) => {
                  let breakdown: any = {}; try { breakdown = JSON.parse(p.breakdown || "{}"); } catch (e) {}
                  const accountName = user.accounts.find((a: any) => a.id === p.accountId)?.name || "Unknown";
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-4 md:p-5 text-slate-300 whitespace-nowrap">{fmtDate(p.paidOn)}</td>
                      <td className="p-4 md:p-5 text-indigo-400 font-semibold whitespace-nowrap">{accountName}</td>
                      <td className="p-4 md:p-5 text-sm text-slate-400">
                        <div className="flex flex-col gap-1">
                          {breakdown.savings > 0 && <span className="whitespace-nowrap">Savings: {fmt(breakdown.savings)}</span>}
                          {breakdown.normal > 0 && <span className="whitespace-nowrap">Normal: {fmt(breakdown.normal)}</span>}
                          {breakdown.emergency > 0 && <span className="whitespace-nowrap">Emergency: {fmt(breakdown.emergency)}</span>}
                        </div>
                      </td>
                      <td className="p-4 md:p-5 font-bold text-white whitespace-nowrap">{fmt(p.totalAmount)}</td>
                      <td className="p-4 md:p-5 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : p.status === "pending" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}