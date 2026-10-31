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
    include: {
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!user) return <p className="text-white p-8">Loading…</p>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto bg-slate-950 min-h-screen p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Payment History</h1>
          <p className="text-slate-400 mt-1">A full record of all your contributions and loan repayments.</p>
        </div>
        <Link href="/dashboard" className="rounded-xl bg-slate-800 px-6 py-2.5 font-semibold text-white shadow-sm border border-slate-700 hover:bg-slate-700 transition">
          Back to Dashboard
        </Link>
      </div>

      <div className="rounded-3xl bg-slate-900 shadow-lg border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700 text-sm font-semibold text-slate-300">
                <th className="p-4">Date Paid</th>
                <th className="p-4">Payment Type</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Reason (If Rejected)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {user.payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    You have not made any payments yet.
                  </td>
                </tr>
              ) : (
                user.payments.map((p: any) => {
                  let breakdown: any = {};
                  try { breakdown = JSON.parse(p.breakdown || "{}"); } catch (e) {}

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/50 transition">
                      <td className="p-4 text-slate-300">
                        {fmtDate(p.paidOn)}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {breakdown.savings > 0 && <span className="text-xs font-bold text-indigo-400 bg-indigo-500/20 px-2 py-1 rounded w-fit">Savings: {fmt(breakdown.savings)}</span>}
                          {breakdown.normal > 0 && <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-1 rounded w-fit">Normal Loan: {fmt(breakdown.normal)}</span>}
                          {breakdown.emergency > 0 && <span className="text-xs font-bold text-orange-400 bg-orange-500/20 px-2 py-1 rounded w-fit">Emergency Loan: {fmt(breakdown.emergency)}</span>}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-white">
                        {fmt(p.totalAmount)}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                          p.status === "approved" ? "bg-emerald-500/20 text-emerald-400" :
                          p.status === "pending" ? "bg-amber-500/20 text-amber-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-red-400 max-w-[200px]">
                        {p.status === "rejected" && p.rejectReason ? p.rejectReason : "-"}
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