import { prisma } from "@/lib/prisma";
import { fmt, fmtDate } from "@/lib/helpers";
import { approveWithdrawal } from "../actions";
import { connection } from "next/server";

export default async function AdminWithdrawalsPage() {
  await connection();

  const withdrawals = await prisma.withdrawal.findMany({
    where: { status: "pending" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-10">
      <h1 className="text-3xl font-bold text-white mb-6">Pending Withdrawals</h1>
      
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {withdrawals.length === 0 ? (
          <p className="p-8 text-center text-slate-400">No pending withdrawal requests.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {withdrawals.map((w: any) => (
              <div key={w.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-white text-lg">{fmt(w.totalAmount)}</p>
                  <p className="text-sm text-slate-300">{w.user.fullName} • ID: {w.user.idNumber}</p>
                  
                  <div className="text-xs text-slate-400 mt-2 flex flex-wrap gap-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    {w.account1Amt > 0 && <span>Acc 1: <span className="text-white">{fmt(w.account1Amt)}</span></span>}
                    {w.account2Amt > 0 && <span>Acc 2: <span className="text-white">{fmt(w.account2Amt)}</span></span>}
                    <span>Via: <span className="text-white uppercase">{w.method.replace("_", " ")}</span></span>
                    <span>Date: <span className="text-white">{fmtDate(w.paidOn)}</span></span>
                  </div>

                  {w.methodDetails && (
                    <div className="mt-3 text-sm font-semibold text-indigo-300 bg-indigo-500/10 p-2 rounded border border-indigo-500/20">
                      <span className="text-slate-400">User Details: </span>
                      {w.methodDetails}
                    </div>
                  )}
                </div>

                <form action={async () => {
                  "use server";
                  await approveWithdrawal(w.id);
                }}>
                  <button className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition whitespace-nowrap">
                    Approve Withdrawal
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}