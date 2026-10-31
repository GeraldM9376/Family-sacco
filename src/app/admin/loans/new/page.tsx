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
    <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-lg border border-gray-100">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Issue New Loan</h1>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">User ID Number</label>
          <input name="idNumber" required placeholder="e.g. 12345678"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-black font-semibold outline-none focus:border-indigo-500" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">Loan Type</label>
          <select name="type" className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-black font-semibold outline-none focus:border-indigo-500 bg-white">
            <option value="normal">Normal Loan</option>
            <option value="emergency">Emergency Loan</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">Amount Issued (Principal)</label>
            <input name="principal" type="number" min="1" required placeholder="e.g. 5000"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-black font-semibold outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">Amount to Pay (With Interest)</label>
            <input name="amountToPay" type="number" min="1" required placeholder="e.g. 5500"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-black font-semibold outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">Date Issued</label>
            <input name="issuedOn" type="date" required
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-black font-semibold outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">Due Date</label>
            <input name="dueDate" type="date" required
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-black font-semibold outline-none focus:border-indigo-500" />
          </div>
        </div>

        {err && <p className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded">{err}</p>}

        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-gray-900 py-3 font-bold text-white hover:bg-gray-800 transition disabled:opacity-50 flex justify-center items-center gap-2">
          {loading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : "Issue Loan"}
        </button>
      </form>
    </div>
  );
}