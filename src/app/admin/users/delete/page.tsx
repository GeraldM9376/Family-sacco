"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DeleteUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr("");

    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());

    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(data.error || "Failed to delete user.");
        setLoading(false);
        return;
      }

      // Success!
      router.push("/admin/users?msg=User deleted successfully");
      router.refresh();
    } catch (error: any) {
      setErr("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-lg border border-red-100 mt-10">
      <h1 className="mb-2 text-2xl font-bold text-red-600">Delete User</h1>
      <p className="mb-6 text-sm text-gray-500">This action is permanent and will delete all their loans and payments.</p>

      <form onSubmit={handleDelete} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">User ID Number</label>
          <input name="idNumber" required placeholder="e.g. 12345678"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-red-500" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">Phone Number</label>
          <input name="phone" required placeholder="+254712345678"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-red-500" />
        </div>

        <div className="pt-4 border-t border-gray-200">
          <label className="mb-1 block text-sm font-bold text-gray-700">Type <strong>DELETE</strong> to confirm</label>
          <input name="confirmation" required placeholder="DELETE"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-red-500 uppercase" />
        </div>

        {err && <p className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded">{err}</p>}

        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700 transition disabled:opacity-50 flex justify-center items-center gap-2">
          {loading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : "Permanently Delete User"}
        </button>
        
        <Link href="/admin/users" className="block text-center text-sm font-bold text-gray-500 mt-4 hover:underline">Cancel</Link>
      </form>
    </div>
  );
}