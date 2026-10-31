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

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">My Loans</h1>
          <p className="text-gray-500 mt-1">Track all the loans you've taken and their due dates.</p>
        </div>
        <Link href="/dashboard" className="rounded-xl bg-white px-6 py-2.5 font-semibold text-gray-700 shadow-sm border hover:bg-gray-50">
          Back to Dashboard
        </Link>
      </div>

      <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-6 text-indigo-900 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg">Want to request a new loan?</h3>
          <p className="text-sm text-indigo-700 mt-1">Loan requests are currently handled manually by the admin.</p>
        </div>
        <div className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-bold shadow-md">
          Contact Admin to Request Loan
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {user.loans.length === 0 ? (
          <div className="col-span-2 rounded-2xl bg-white p-10 text-center border border-gray-100 shadow-sm">
            <p className="text-gray-500">You have not taken any loans yet.</p>
          </div>
        ) : (
          user.loans.map((loan: any) => {
            const remaining = loan.amountToPay - loan.paidAmount;
            return (
              <div key={loan.id} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{loan.type} Loan</span>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{fmt(loan.amountToPay)}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    loan.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}>
                    {loan.status === "paid" ? "Fully Paid" : "Active"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs">Amount Issued</p>
                    <p className="font-semibold text-gray-900">{fmt(loan.principal)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs">Date Issued</p>
                    <p className="font-semibold text-gray-900">{fmtDate(loan.issuedOn)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs">Due Date</p>
                    <p className="font-semibold text-red-600">{fmtDate(loan.dueDate)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs">Amount Paid</p>
                    <p className="font-semibold text-emerald-600">{fmt(loan.paidAmount)}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">Remaining Debt</span>
                    <span className="font-bold text-gray-900">{fmt(remaining)}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
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