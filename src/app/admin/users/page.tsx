import { prisma } from "@/lib/prisma";
import { fmt } from "@/lib/helpers";
import Link from "next/link";
import { connection } from "next/server";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; msg?: string }> }) {
  await connection();
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || "";
  const msg = resolvedParams.msg;

  const users = await prisma.user.findMany({
    where: q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { idNumber: { contains: q } }, { phone: { contains: q } }] } : {},
    include: { accounts: true, loans: { where: { status: "unpaid" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-10">
      {msg && <div className="bg-indigo-500/20 text-indigo-300 p-4 rounded-xl border border-indigo-500/30 font-bold mb-6">{msg}</div>}
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Manage Users</h1>
          <p className="text-slate-400 mt-1">Search and view all registered members.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/users/delete" className="rounded-xl bg-slate-800 px-5 py-2.5 font-bold text-red-400 hover:bg-slate-700 transition border border-slate-700">Delete User</Link>
          <form className="flex w-full md:w-80 gap-2">
            <input type="text" name="q" defaultValue={q} placeholder="Search user..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-white outline-none focus:border-indigo-500" />
            <button className="rounded-xl bg-indigo-600 px-6 font-bold text-white hover:bg-indigo-500 transition">Search</button>
          </form>
        </div>
      </div>

      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                <th className="p-5">Name</th>
                <th className="p-5">ID Number</th>
                <th className="p-5">Phone</th>
                <th className="p-5 text-right">Total Savings</th>
                <th className="p-5 text-right">Total Debt</th>
                <th className="p-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((user: any) => {
                const totalSavings = user.accounts.reduce((sum: number, a: any) => sum + a.balance, 0);
                const totalDebt = user.loans.reduce((sum: number, l: any) => sum + (l.amountToPay - l.paidAmount), 0);
                return (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-5 font-bold text-white">{user.fullName}</td>
                    <td className="p-5 font-mono text-slate-300">{user.idNumber}</td>
                    <td className="p-5 text-slate-300">{user.phone}</td>
                    <td className="p-5 text-right font-semibold text-emerald-400">{fmt(totalSavings)}</td>
                    <td className={`p-5 text-right font-semibold ${totalDebt > 0 ? "text-red-400" : "text-slate-600"}`}>{fmt(totalDebt)}</td>
                    <td className="p-5 text-center">
                      <Link href={`/admin/users/${user.id}`} className="text-sm font-bold text-indigo-400 hover:underline">View Profile</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}