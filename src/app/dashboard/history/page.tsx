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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Payment History</h1>
          <p className="text-slate-400 mt-1">A full record of all your contributions.</p>
        </div>
        <Link href="/dashboard" className="rounded-xl bg-slate-800 px-6 py-2.5 font-semibold text-white hover:bg-slate-700 transition">Back</Link>
      </div>

      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-widest">
              <th className="p-5">Date</th>
              <th className="p-5">Account</th>
              <th className="p-5">Breakdown</th>
              <th className="p-5">Amount</th>
              <th className="p-5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {user.payments.map((p: any) => {
              let breakdown: any = {}; try { breakdown = JSON.parse(p.breakdown || "{}"); } catch (e) {}
              const accountName = user.accounts.find((a: any) => a.id === p.accountId)?.name;
              return (
                <tr key={p.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-5 text-slate-300">{fmtDate(p.paidOn)}</td>
                  <td className="p-5 text-indigo-400 font-semibold">{accountName}</td>
                  <td className="p-5 text-sm text-slate-400">
                    {breakdown.savings > 0 && <span>Savings: {fmt(breakdown.savings)}<br/></span>}
                    {breakdown.normal > 0 && <span>Normal: {fmt(breakdown.normal)}<br/></span>}
                    {breakdown.emergency > 0 && <span>Emergency: {fmt(breakdown.emergency)}</span>}
                  </td>
                  <td className="p-5 font-bold text-white">{fmt(p.totalAmount)}</td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : p.status === "pending" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}