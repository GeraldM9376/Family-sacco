import { prisma } from "@/lib/prisma";
import { fmt } from "@/lib/helpers";
import Link from "next/link";
import { connection } from "next/server";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await connection();

  const resolvedParams = await searchParams;
  const q = resolvedParams.q || "";

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Manage Users</h1>
          <p className="text-gray-500">Search and view all registered members.</p>
        </div>
        
        <div className="flex gap-2">
          <Link href="/admin/users/delete" className="rounded-xl bg-red-100 px-4 py-2.5 font-bold text-red-700 hover:bg-red-200 transition">
            Delete User
          </Link>
          <form className="flex w-full md:w-96 gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by Name, ID or Phone..."
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 outline-none focus:border-indigo-500"
            />
            <button className="rounded-xl bg-indigo-600 px-6 font-bold text-white hover:bg-indigo-700 transition">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-3xl bg-white shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600">
                <th className="p-4">Name</th>
                <th className="p-4">ID Number</th>
                <th className="p-4">Phone</th>
                <th className="p-4 text-right">Savings</th>
                <th className="p-4 text-right">Normal Debt</th>
                <th className="p-4 text-right">Emergency Debt</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No users found matching "{q}".
                  </td>
                </tr>
              ) : (
                users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-bold text-gray-900">{user.fullName}</td>
                    <td className="p-4 font-mono text-gray-600">{user.idNumber}</td>
                    <td className="p-4 text-gray-600">{user.phone}</td>
                    <td className="p-4 text-right font-semibold text-emerald-600">{fmt(user.savingsTotal)}</td>
                    <td className={`p-4 text-right font-semibold ${user.normalDebt > 0 ? "text-red-500" : "text-gray-400"}`}>
                      {fmt(user.normalDebt)}
                    </td>
                    <td className={`p-4 text-right font-semibold ${user.emergencyDebt > 0 ? "text-red-500" : "text-gray-400"}`}>
                      {fmt(user.emergencyDebt)}
                    </td>
                    <td className="p-4 text-center">
                      <Link href={`/admin/users/${user.id}`} className="text-sm font-bold text-indigo-600 hover:underline">
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