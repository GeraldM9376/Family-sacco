import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fmt, fmtDate } from "@/lib/helpers";
import Link from "next/link";
import { connection } from "next/server";

export default async function MyLoansPage() {
  await connection();

  const s = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: (s!.user as any).id },
    include: {
      loans: { orderBy: { issuedOn: "desc" } },
    },
  });

  if (!user) return <p className="text-white p-8">Loading…</p>;

  return (
    <div className="space-y-6 bg-slate-950 min-h-screen p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">My Loans</h1>
          <p className="text-slate-400 mt-1">Track all the loans you've taken and their due dates.</p>
        </div>
        <Link href="/dashboard" className="rounded-xl bg-slate-800 px-6 py-2.5 font-semibold text-white shadow-sm border border-slate-700 hover:bg-slate-700 transition">
          Back to Dashboard
        </Link>
      </div>

      {/* Dark Mode Request Banner */}
      <div className="rounded-2xl bg-slate-800 border border-slate-700 p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="font-bold text-lg text-white">Want to request a new loan?</h3>
          <p className="text-sm text-slate-400 mt-1">Loan requests are currently handled manually by the admin.</p>
        </div>
        <div className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-bold shadow-md hover:bg-indigo-500 transition cursor-pointer">
          Contact Admin to Request Loan
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {user.loans.length === 0 ? (
          <div className="col-span-2 rounded-2xl bg-slate-900 p-10 text-center border border-slate-800 shadow-sm">
            <p className="text-slate-400">You have not taken any loans yet.</p>
          </div>
        ) : (
          user.loans.map((loan: any) => {
            const remaining = loan.amountToPay - loan.paidAmount;
            return (
              <div key={loan.id} className="rounded-2xl bg-slate-900 p-6 shadow-sm border border-slate-800">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{loan.type} Loan</span>
                    <h3 className="text-2xl font-bold text-white mt-1">{fmt(loan.amountToPay)}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    loan.status === "paid" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {loan.status === "paid" ? "Fully Paid" : "Active"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                    <p className="text-slate-400 text-xs">Amount Issued</p>
                    <p className="font-semibold text-white">{fmt(loan.principal)}</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                    <p className="text-slate-400 text-xs">Date Issued</p>
                    <p className="font-semibold text-white">{fmtDate(loan.issuedOn)}</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                    <p className="text-slate-400 text-xs">Due Date</p>
                    <p className="font-semibold text-red-400">{fmtDate(loan.dueDate)}</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                    <p className="text-slate-400 text-xs">Amount Paid</p>
                    <p className="font-semibold text-emerald-400">{fmt(loan.paidAmount)}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-300">Remaining Debt</span>
                    <span className="font-bold text-white">{fmt(remaining)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${remaining === 0 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(100, (loan.paidAmount / loan.amountToPay) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}