import { prisma } from "@/lib/prisma";
import { fmt, fmtDate } from "@/lib/helpers";
import { approvePayment, rejectPayment } from "./actions";
import Link from "next/link";

export default async function AdminDashboard() {
  const pendingPayments = await prisma.payment.findMany({
    where: { status: "pending" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Manage user approvals and system settings.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin/users" className="rounded-xl bg-white px-6 py-2.5 font-semibold text-gray-700 shadow-sm border hover:bg-gray-50">
            View All Users
          </Link>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          Pending Approvals
          <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full">{pendingPayments.length}</span>
        </h2>

        {pendingPayments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">All caught up! No pending payments.</p>
        ) : (
          <div className="space-y-4">
            {pendingPayments.map((p: any) => (
              <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-gray-200 p-5 bg-gray-50">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                      p.type === 'savings' ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {p.type}
                    </span>
                    <p className="font-bold text-gray-900">{fmt(p.amount)}</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{p.user.fullName}</span> (ID: {p.user.idNumber})
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Paid on {fmtDate(p.paidOn)} by {p.payerName}
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <form action={async () => {
                    "use server";
                    await approvePayment(p.id);
                  }} className="flex-1 md:flex-none">
                    <button className="w-full rounded-xl bg-emerald-500 px-6 py-2 text-sm font-bold text-white hover:bg-emerald-600 transition">
                      Approve
                    </button>
                  </form>

                  <form action={async (formData) => {
                    "use server";
                    const reason = formData.get("reason") as string;
                    await rejectPayment(p.id, reason);
                  }} className="flex-1 md:flex-none flex gap-2">
                    <input name="reason" placeholder="Reason for rejection..." required
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-500" />
                    <button className="rounded-xl bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200 transition">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}