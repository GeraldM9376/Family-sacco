"use client";
import { useState, useEffect } from "react";

export default function NewLoanPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  
  // State for auto-calculating the due date
  const [issuedOn, setIssuedOn] = useState("");
  const [periodMonths, setPeriodMonths] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Auto-calculate Due Date whenever issuedOn or periodMonths changes
  useEffect(() => {
    if (issuedOn && periodMonths) {
      const issuedDate = new Date(issuedOn);
      if (!isNaN(issuedDate.getTime())) {
        const dueDateObj = new Date(issuedDate);
        dueDateObj.setMonth(dueDateObj.getMonth() + Number(periodMonths));
        const formatted = dueDateObj.toISOString().split("T")[0];
        setDueDate(formatted);
      }
    } else {
      setDueDate("");
    }
  }, [issuedOn, periodMonths]);

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
    <div className="mx-auto max-w-2xl p-4 md:p-10">
      <div className="rounded-2xl bg-slate-900 p-8 border border-slate-800 shadow-xl">
        <h1 className="mb-6 text-2xl font-bold text-white">Issue New Loan</h1>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">User ID Number</label>
            <input name="idNumber" required placeholder="e.g. 12345678"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-300">Loan Type</label>
              <select name="type" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500">
                <option value="normal">Normal Loan</option>
                <option value="emergency">Emergency Loan</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-300">Target Account</label>
              <select name="accountName" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500">
                <option value="Account 1">Account 1</option>
                <option value="Account 2">Account 2</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-300">Amount Issued</label>
              <input name="principal" type="number" required placeholder="e.g. 5000"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-300">Total to Pay</label>
              <input name="amountToPay" type="number" required placeholder="e.g. 5500"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-300">Issued Date</label>
              <input name="issuedOn" type="date" required value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-300">Payment Period (Months)</label>
              <input name="periodMonths" type="number" min="1" required value={periodMonths} onChange={(e) => setPeriodMonths(e.target.value)} placeholder="e.g. 5"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Due Date (Auto-calculated)</label>
            <input name="dueDate" type="date" readOnly value={dueDate}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-slate-400 outline-none cursor-not-allowed" />
            <p className="text-xs text-slate-500 mt-1">Automatically calculated based on the Issued Date and Payment Period.</p>
          </div>

          {err && <p className="text-red-400 text-sm font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">{err}</p>}

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50">
            {loading ? "Issuing Loan..." : "Issue Loan"}
          </button>
        </form>
      </div>
    </div>
  );
}