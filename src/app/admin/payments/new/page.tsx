"use client";
import { useState } from "react";

export default function AdminPaymentPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());

    try {
      const res = await fetch("/api/admin/record-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Failed to record payment."); setLoading(false); return; }
      window.location.href = "/admin?msg=Payment recorded successfully";
    } catch (error: any) {
      setErr("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-10">
      <div className="rounded-3xl bg-slate-900 p-8 border border-slate-800 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold text-white">Record Payment</h1>
        <p className="text-sm text-slate-400 mb-8">Use this if a user has paid you directly.</p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-300">User ID Number</label>
            <input name="idNumber" required placeholder="e.g. 12345678" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-300">Payment Type</label>
              <select name="type" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500">
                <option value="savings">Savings</option>
                <option value="normal">Normal Loan</option>
                <option value="emergency">Emergency Loan</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-300">Target Account</label>
              <select name="accountName" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500">
                <option value="Account 1">Account 1</option>
                <option value="Account 2">Account 2</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-300">Amount (KES)</label>
              <input name="amount" type="number" min="1" required placeholder="e.g. 1000" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-300">Date Paid</label>
              <input name="paidOn" type="date" required className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-300">Name on Payment</label>
            <input name="payerName" required placeholder="JOHN DOE" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500 uppercase" />
          </div>
          {err && <p className="text-red-400 text-sm font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">{err}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-emerald-600 py-3.5 font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50">
            {loading ? "Recording..." : "Record Payment"}
          </button>
        </form>
      </div>
    </div>
  );
}