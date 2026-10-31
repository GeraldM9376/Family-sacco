"use client";
import { useState } from "react";
import Link from "next/link";

export default function DeleteUserPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [phone, setPhone] = useState("+254");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.startsWith("0")) val = val.substring(1);
    if (val.startsWith("254")) val = val.substring(3);
    if (val.length > 9) val = val.substring(0, 9);
    setPhone("+254" + val);
  };

  async function handleDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr("");

    const fd = new FormData(e.currentTarget);
    fd.set("phone", phone);

    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(fd.entries())),
      });

      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Failed to delete user.");
        setLoading(false);
        return;
      }
      window.location.href = "/admin/users?msg=User deleted successfully";
    } catch (error: any) {
      setErr("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-slate-900 p-8 shadow-lg border border-red-900/30 mt-10">
      <h1 className="mb-2 text-2xl font-bold text-red-500">Delete User</h1>
      <p className="mb-6 text-sm text-slate-400">This action is permanent and will delete all their loans and payments.</p>

      <form onSubmit={handleDelete} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-300">User ID Number</label>
          <input name="idNumber" required placeholder="e.g. 12345678"
            className="w-full rounded-xl border-2 border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-red-500" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-300">Phone Number</label>
          <input name="phone" required value={phone} onChange={handlePhoneChange} placeholder="+254712345678"
            className="w-full rounded-xl border-2 border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-red-500" />
        </div>

        <div className="pt-4 border-t border-slate-700">
          <label className="mb-1 block text-sm font-bold text-slate-300">Type <strong>DELETE</strong> to confirm</label>
          <input name="confirmation" required placeholder="DELETE"
            className="w-full rounded-xl border-2 border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-red-500 uppercase" />
        </div>

        {err && <p className="text-red-400 text-sm font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">{err}</p>}

        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-500 transition disabled:opacity-50 flex justify-center items-center gap-2">
          {loading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : "Permanently Delete User"}
        </button>
        
        <Link href="/admin/users" className="block text-center text-sm font-bold text-slate-400 mt-4 hover:underline">Cancel</Link>
      </form>
    </div>
  );
}