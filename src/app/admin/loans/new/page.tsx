"use client";
import { useState } from "react";

export default function NewLoanPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr("");

    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());

    try {
      const res = await fetch("/api/admin/create-loan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Failed to issue loan.");
        setLoading(false);
        return;
      }
      window.location.href = "/admin?msg=Loan issued successfully";
    } catch (error: any) {
      setErr("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl bg-slate-900 p-8 shadow-lg border border-slate-800 mt-10">
      <h1 className="mb-6 text-2xl font-bold text-white">Issue New Loan</h1>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-300">User ID Number</label>
          <input name="idNumber" required placeholder="e.g. 12345678"
            className="w-full rounded-xl border-2 border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-300">Loan Type</label>
          <select name="type" className="w-full rounded-xl border-2 border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500">
            <option value="normal">Normal Loan</option>
            <option value="emergency">Emergency Loan</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Amount Issued (Principal)</label>
            <input name="principal" type="number" min="1" required placeholder="e.g. 5000"
              className="w-full rounded-xl border-2 border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Amount to Pay (With Interest)</label>
            <input name="amountToPay" type="number" min="1" required placeholder="e.g. 5500"
              className="w-full rounded-xl border-2 border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Date Issued</label>
            <input name="issuedOn" type="date" required
              className="w-full rounded-xl border-2 border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Due Date</label>
            <input name="dueDate" type="date" required
              className="w-full rounded-xl border-2 border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
          </div>
        </div>

        {err && <p className="text-red-400 text-sm font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">{err}</p>}

        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50 flex justify-center items-center gap-2">
          {loading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : "Issue Loan"}
        </button>
      </form>
    </div>
  );
}