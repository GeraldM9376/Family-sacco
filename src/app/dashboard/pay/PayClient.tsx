"use client";
import { useState } from "react";
import { submitBulkPayment } from "./actions";
import { useRouter } from "next/navigation";

export default function PayClient({ user, setting }: { user: any, setting: any }) {
  const router = useRouter();
  const [amounts, setAmounts] = useState({ savings: "", normal: "", emergency: "" });
  const [total, setTotal] = useState<number | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [method, setMethod] = useState<"self" | "admin" | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleAmountChange = (field: "savings" | "normal" | "emergency", value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, "");
    setAmounts({ ...amounts, [field]: cleanValue });
  };

  const calculateTotal = () => {
    const s = Number(amounts.savings) || 0;
    const n = Number(amounts.normal) || 0;
    const e = Number(amounts.emergency) || 0;
    
    if (s < 0 || n < 0 || e < 0) return setErr("Amounts cannot be negative.");
    const sum = s + n + e;
    if (sum <= 0) return setErr("Please enter at least one amount.");
    if (n > user.normalDebt) return setErr(`You cannot pay more than ${user.normalDebt} for normal loans.`);
    if (e > user.emergencyDebt) return setErr(`You cannot pay more than ${user.emergencyDebt} for emergency loans.`);
    
    setErr("");
    setTotal(sum);
    setShowOptions(true);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErr("");
    
    const fd = new FormData(e.currentTarget);
    fd.append("totalAmount", total?.toString() || "0");
    fd.append("savingsAmt", amounts.savings || "0");
    fd.append("normalAmt", amounts.normal || "0");
    fd.append("emergencyAmt", amounts.emergency || "0");
    fd.append("method", method || "");

    try {
      await submitBulkPayment(fd);
      window.location.href = "/dashboard?msg=Payment submitted for approval";
    } catch (error: any) {
      setErr(error.message || "Something went wrong. Please try again.");
      setLoading(false); 
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-slate-950 min-h-screen p-4 md:p-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-white">Make a Payment</h1>
        <p className="text-slate-400 mt-1">Select what you are paying for and calculate your total.</p>
      </div>

      {!showOptions && (
        <div className="rounded-3xl bg-slate-900 p-8 shadow-lg border border-slate-800 space-y-4">
          <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div>
              <p className="font-bold text-white">Monthly Savings</p>
              <p className="text-xs text-slate-400">Min: KES 350</p>
            </div>
            <input type="number" min="0" step="1" placeholder="0" value={amounts.savings} onChange={(e) => handleAmountChange("savings", e.target.value)}
              className="w-32 rounded-lg border-2 border-slate-600 bg-slate-900 px-3 py-2 text-white font-semibold text-right outline-none focus:border-indigo-500" />
          </div>

          <div className={`flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700 ${user.normalDebt <= 0 ? 'opacity-50' : ''}`}>
            <div>
              <p className="font-bold text-white">Normal Loan Repayment</p>
              <p className="text-xs text-red-400">Outstanding: KES {user.normalDebt}</p>
            </div>
            <input type="number" min="0" step="1" disabled={user.normalDebt <= 0} placeholder="0" value={amounts.normal} onChange={(e) => handleAmountChange("normal", e.target.value)}
              className="w-32 rounded-lg border-2 border-slate-600 bg-slate-900 px-3 py-2 text-white font-semibold text-right outline-none focus:border-indigo-500 disabled:bg-slate-800" />
          </div>

          <div className={`flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700 ${user.emergencyDebt <= 0 ? 'opacity-50' : ''}`}>
            <div>
              <p className="font-bold text-white">Emergency Loan Repayment</p>
              <p className="text-xs text-red-400">Outstanding: KES {user.emergencyDebt}</p>
            </div>
            <input type="number" min="0" step="1" disabled={user.emergencyDebt <= 0} placeholder="0" value={amounts.emergency} onChange={(e) => handleAmountChange("emergency", e.target.value)}
              className="w-32 rounded-lg border-2 border-slate-600 bg-slate-900 px-3 py-2 text-white font-semibold text-right outline-none focus:border-indigo-500 disabled:bg-slate-800" />
          </div>

          {err && <p className="text-red-400 text-sm font-bold text-center bg-red-500/10 p-2 rounded border border-red-500/20">{err}</p>}

          <button onClick={calculateTotal} className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-500 transition">
            Calculate Total
          </button>
        </div>
      )}

      {showOptions && (
        <div className="rounded-3xl bg-slate-900 p-8 shadow-lg border border-slate-800">
          <div className="mb-6 rounded-xl bg-emerald-500/10 p-6 text-center border border-emerald-500/20">
            <p className="text-emerald-400 font-medium">Total Amount to Pay</p>
            <p className="text-4xl font-extrabold text-emerald-300 mt-1">KES {total}</p>
            <button onClick={() => setShowOptions(false)} className="mt-2 text-xs text-emerald-400 font-bold underline">Edit amounts</button>
          </div>

          <h3 className="font-bold text-white mb-4">How would you like to pay?</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button onClick={() => setMethod("self")} className={`rounded-xl border-2 p-4 text-center transition ${method === "self" ? "border-indigo-500 bg-indigo-500/20" : "border-slate-700 hover:border-indigo-500/50"}`}>
              <span className="block text-2xl mb-1">📱</span>
              <span className="font-bold text-white text-sm">Pay by Myself</span>
              <span className="block text-xs text-slate-400 mt-1">Via Bank/Paybill</span>
            </button>
            <button onClick={() => setMethod("admin")} className={`rounded-xl border-2 p-4 text-center transition ${method === "admin" ? "border-indigo-500 bg-indigo-500/20" : "border-slate-700 hover:border-indigo-500/50"}`}>
              <span className="block text-2xl mb-1">👨‍💼</span>
              <span className="font-bold text-white text-sm">Admin Pays for Me</span>
              <span className="block text-xs text-slate-400 mt-1">Send to Admin</span>
            </button>
          </div>

          {method && (
            <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-700 pt-6">
              <div className="bg-slate-800 p-4 rounded-xl mb-4 text-sm border border-slate-700">
                {method === "self" ? (
                  <>
                    <p className="font-bold text-indigo-400 mb-2">Bank/Paybill Details</p>
                    <p className="text-white"><strong>Paybill:</strong> {setting?.paybill || "Not set"}</p>
                    <p className="text-white"><strong>Account:</strong> {setting?.accountNo || "Not set"}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-indigo-400 mb-2">Send Money To Admin</p>
                    <p className="text-white"><strong>Phone:</strong> {setting?.sendMoneyTo || "Not set"}</p>
                    <p className="text-white"><strong>Name:</strong> {setting?.adminName || "Not set"}</p>
                  </>
                )}
                <p className="text-xs text-slate-400 mt-2">After sending, fill the form below to submit for approval.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Name on Payment</label>
                  <input name="payerName" required defaultValue={user.fullName} readOnly
                    className="w-full rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-3 text-slate-400 font-semibold outline-none uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Date Paid</label>
                  <input name="paidOn" type="date" required
                    className="w-full rounded-xl border-2 border-slate-700 bg-slate-900 px-4 py-3 text-white font-semibold outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">Your ID Number</label>
                <input required defaultValue={user.idNumber} readOnly
                  className="w-full rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-3 text-slate-400 font-semibold outline-none" />
              </div>

              {err && <p className="text-red-400 text-sm font-bold bg-red-500/10 p-3 rounded border border-red-500/20">{err}</p>}

              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white shadow-lg transition hover:bg-emerald-500 disabled:opacity-50 flex justify-center items-center gap-2">
                {loading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : "Submit for Admin Approval"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}