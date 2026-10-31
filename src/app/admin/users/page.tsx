import { prisma } from "@/lib/prisma";
import { fmt } from "@/lib/helpers";
import Link from "next/link";
import { connection } from "next/server";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; msg?: string }>;
}) {
  await connection();

  const resolvedParams = await searchParams;
  const q = resolvedParams.q || "";
  const msg = resolvedParams.msg;

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { idNumber: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 bg-slate-950 min-h-screen p-4 md:p-8">
      {msg && (
        <div className="bg-emerald-500/20 text-emerald-400 p-4 rounded-xl border border-emerald-500/30 font-bold">
          {msg}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Manage Users</h1>
          <p className="text-slate-400">Search and view all registered members.</p>
        </div>
        
        <div className="flex gap-2">
          <Link href="/admin/users/delete" className="rounded-xl bg-red-500/20 px-4 py-2.5 font-bold text-red-400 hover:bg-red-500/30 transition">
            Delete User
          </Link>
          <form className="flex w-full md:w-96 gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by Name, ID or Phone..."
              className="w-full rounded-xl border-2 border-slate-700 bg-slate-900 px-4 py-2.5 text-white outline-none focus:border-indigo-500"
            />
            <button className="rounded-xl bg-indigo-600 px-6 font-bold text-white hover:bg-indigo-500 transition">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-3xl bg-slate-900 shadow-lg border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700 text-sm font-semibold text-slate-300">
                <th className="p-4">Name</th>
                <th className="p-4">ID Number</th>
                <th className="p-4">Phone</th>
                <th className="p-4 text-right">Savings</th>
                <th className="p-4 text-right">Normal Debt</th>
                <th className="p-4 text-right">Emergency Debt</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No users found matching "{q}".
                  </td>
                </tr>
              ) : (
                users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-4 font-bold text-white">{user.fullName}</td>
                    <td className="p-4 font-mono text-slate-300">{user.idNumber}</td>
                    <td className="p-4 text-slate-300">{user.phone}</td>
                    <td className="p-4 text-right font-semibold text-emerald-400">{fmt(user.savingsTotal)}</td>
                    <td className={`p-4 text-right font-semibold ${user.normalDebt > 0 ? "text-red-400" : "text-slate-500"}`}>
                      {fmt(user.normalDebt)}
                    </td>
                    <td className={`p-4 text-right font-semibold ${user.emergencyDebt > 0 ? "text-red-400" : "text-slate-500"}`}>
                      {fmt(user.emergencyDebt)}
                    </td>
                    <td className="p-4 text-center">
                      <Link href={`/admin/users/${user.id}`} className="text-sm font-bold text-indigo-400 hover:underline">
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}