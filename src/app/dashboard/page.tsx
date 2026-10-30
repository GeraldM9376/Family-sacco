import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Bar } from "@/components/Bar";
import { fmt, savingsPct, loanBarColor, loanPct, fmtDate } from "@/lib/helpers";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const s = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: (s!.user as any).id },
    include: {
      payments: { where: { status: "pending" }, orderBy: { createdAt: "desc" } },
      loans: { where: { status: "unpaid" }, orderBy: { dueDate: "asc" } },
    },
  });
  if (!user) return <p>Loading…</p>;

  // Add types here to fix the TypeScript error
  const normalLoans = user.loans.filter((l: any) => l.type === "normal");
  const emergencyLoans = user.loans.filter((l: any) => l.type === "emergency");
  
  const normalTotal = normalLoans.reduce((a: number, l: any) => a + (l.amountToPay - l.paidAmount), 0);
  const emergencyTotal = emergencyLoans.reduce((a: number, l: any) => a + (l.amountToPay - l.paidAmount), 0);
  
  const normalOriginal = normalLoans.reduce((a: number, l: any) => a + l.amountToPay, 0);
  const emergencyOriginal = emergencyLoans.reduce((a: number, l: any) => a + l.amountToPay, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Welcome back, {user.fullName.split(" ")[0]}
          </h1>
          <p className="text-gray-500">Here is your current financial overview.</p>
        </div>
        <Link href="/dashboard/pay" className="rounded-xl bg-indigo-600 px-6 py-2.5 text-center font-semibold text-white shadow-md hover:bg-indigo-700 transition">
          Make a Payment
        </Link>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Savings Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-xl">
          <div className="absolute -right-4 -top-4 text-8xl opacity-10">💰</div>
          <p className="text-sm font-medium opacity-90">Total Savings</p>
          <p className="mt-2 text-4xl font-extrabold">{fmt(user.savingsTotal)}</p>
          <div className="mt-6">
            <div className="flex justify-between text-xs mb-1 opacity-90">
              <span>Minimum: KES 350</span>
              <span>{Math.round(savingsPct(user.savingsTotal))}%</span>
            </div>
            <Bar pct={savingsPct(user.savingsTotal)} color="emerald" />
          </div>
        </div>

        {/* Normal Loan Card */}
        <div className="rounded-3xl bg-white p-6 shadow-lg border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Normal Loan Debt</p>
              <p className={`mt-2 text-3xl font-bold ${normalTotal === 0 ? "text-emerald-600" : "text-red-600"}`}>
                {fmt(normalTotal)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${normalTotal === 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
              {normalTotal === 0 ? "✓" : "!"}
            </div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{normalTotal === 0 ? "Fully Settled" : "Repayment Progress"}</span>
              <span>{Math.round(loanPct(normalTotal, normalOriginal))}%</span>
            </div>
            <Bar pct={loanPct(normalTotal, normalOriginal)} color={loanBarColor(normalTotal) as any} />
          </div>
        </div>

        {/* Emergency Loan Card */}
        <div className="rounded-3xl bg-white p-6 shadow-lg border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Emergency Loan Debt</p>
              <p className={`mt-2 text-3xl font-bold ${emergencyTotal === 0 ? "text-emerald-600" : "text-red-600"}`}>
                {fmt(emergencyTotal)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${emergencyTotal === 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
              {emergencyTotal === 0 ? "✓" : "!"}
            </div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{emergencyTotal === 0 ? "Fully Settled" : "Repayment Progress"}</span>
              <span>{Math.round(loanPct(emergencyTotal, emergencyOriginal))}%</span>
            </div>
            <Bar pct={loanPct(emergencyTotal, emergencyOriginal)} color={loanBarColor(emergencyTotal) as any} />
          </div>
        </div>
      </div>

      {/* Pending Approvals & Upcoming Loans */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Pending Approvals */}
        <div className="rounded-3xl bg-white p-6 shadow-lg border border-gray-100">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Pending Approvals</h2>
          {user.payments.length === 0 ? (
            <p className="text-sm text-gray-500">No payments waiting for approval.</p>
          ) : (
            <div className="space-y-3">
              {user.payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl bg-amber-50 p-4 border border-amber-100">
                  <div>
                    <p className="text-sm font-bold text-amber-900 capitalize">{p.type} Payment</p>
                    <p className="text-xs text-amber-700">{fmt(p.amount)} — awaiting admin</p>
                  </div>
                  <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-bold text-amber-800">Pending</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Loans */}
        <div className="rounded-3xl bg-white p-6 shadow-lg border border-gray-100">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Upcoming Loan Due Dates</h2>
          {user.loans.length === 0 ? (
            <p className="text-sm text-gray-500">You have no active loans.</p>
          ) : (
            <div className="space-y-3">
              {user.loans.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-4 border border-gray-200">
                  <div>
                    <p className="text-sm font-bold text-gray-900 capitalize">{l.type} Loan</p>
                    <p className="text-xs text-gray-500">Due: {fmtDate(l.dueDate)}</p>
                  </div>
                  <span className="font-semibold text-gray-800">{fmt(l.amountToPay - l.paidAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}