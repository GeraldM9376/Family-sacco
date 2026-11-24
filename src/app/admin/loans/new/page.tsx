"use client";
import { useState, useEffect } from "react";

export default function NewLoanPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  
  const [loanType, setLoanType] = useState("normal");
  const [principal, setPrincipal] = useState("");
  const [interest, setInterest] = useState("");
  const [totalToPay, setTotalToPay] = useState("");
  
  const [issuedOn, setIssuedOn] = useState("");
  const [periodMonths, setPeriodMonths] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Auto-calculate Total to Pay for Emergency loans
  useEffect(() => {
    if (loanType === "emergency") {
      const p = Number(principal) || 0;
      const i = Number(interest) || 0;
      setTotalToPay(String(p + i));
    }
  }, [principal, interest, loanType]);

  // Auto-calculate Due Date
  useEffect(() => {
    if (issuedOn) {
      const months = loanType === "emergency" ? 4 : Number(periodMonths);
      if (months > 0) {
        const issuedDate = new Date(issuedOn);
        if (!isNaN(issuedDate.getTime())) {
          const dueDateObj = new Date(issuedDate);
          dueDateObj.setMonth(dueDateObj.getMonth() + months);
          const formatted = dueDateObj.toISOString().split("T")[0];
          setDueDate(formatted);
        }
      }
    } else {
      setDueDate("");
    }
  }, [issuedOn, periodMonths, loanType]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());

    // If emergency, make sure we send the calculated total and period
    if (loanType === "emergency") {
      body.amountToPay = totalToPay;
      body.periodMonths = "4";
    }

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
            <label className="mb-1 block text-sm font-bold text-slate-300">User Member Number</label>
            <input name="idNumber" required placeholder="e.g. 123"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Loan Type</label>
            <select name="type" value={loanType} onChange={(e) => setLoanType(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500">
              <option value="normal">Normal Loan</option>
              <option value="emergency">Emergency Loan</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-300">Amount Issued (Principal)</label>
              <input name="principal" type="number" required placeholder="e.g. 5000" value={principal} onChange={(e) => setPrincipal(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
            </div>
            
            {loanType === "emergency" ? (
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-300">Fixed Interest Amount</label>
                <input name="interestAmount" type="number" required placeholder="e.g. 1000" value={interest} onChange={(e) => setInterest(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-300">Total to Pay</label>
              <input name="amountToPay" type="number" required placeholder="e.g. 5500" value={totalToPay} onChange={(e) => setTotalToPay(e.target.value)}
                readOnly={loanType === "emergency"}
                className={`w-full rounded-lg border border-slate-700 px-4 py-3 text-white outline-none focus:border-indigo-500 ${loanType === "emergency" ? 'bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-slate-950'}`} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-300">Issued Date</label>
              <input name="issuedOn" type="date" required value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
            </div>
          </div>

          {/* Only show Payment Period for Normal Loans */}
          {loanType === "normal" ? (
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-300">Payment Period (Months)</label>
              <input name="periodMonths" type="number" min="1" required value={periodMonths} onChange={(e) => setPeriodMonths(e.target.value)} placeholder="e.g. 5"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
            </div>
          ) : (
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-lg text-sm text-indigo-300">
              <strong>Emergency Loan Format:</strong> Fixed at 4 months. The interest is divided equally across Months 1-3, and Month 4 includes the remaining interest + the full Principal.
            </div>
          )}

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