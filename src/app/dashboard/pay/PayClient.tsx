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

  // Helper to stop negative numbers and letters in the input
  const handleAmountChange = (field: "savings" | "normal" | "emergency", value: string) => {
    // If the user types a minus sign or letters, replace them with empty string
    const cleanValue = value.replace(/[^0-9]/g, "");
    setAmounts({ ...amounts, [field]: cleanValue });
  };

  const calculateTotal = () => {
    const s = Number(amounts.savings) || 0;
    const n = Number(amounts.normal) || 0;
    const e = Number(amounts.emergency) || 0;
    
    // Strict check for negative numbers
    if (s < 0 || n < 0 || e < 0) {
      return setErr("Amounts cannot be negative.");
    }

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
    if (loading) return; // Prevent double clicks

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
      
      // Hard redirect to guarantee the spinner stops and page reloads
      window.location.href = "/dashboard?msg=Payment submitted for approval";
      
    } catch (error: any) {
      setErr(error.message || "Something went wrong. Please try again.");
      setLoading(false); // Stop the spinner on error
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900">Make a Payment</h1>
        <p className="text-gray-500 mt-1">Select what you are paying for and calculate your total.</p>
      </div>

      {!showOptions && (
        <div className="rounded-3xl bg-white p-8 shadow-lg border border-gray-100 space-y-4">
          <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl">
            <div>
              <p className="font-bold text-indigo-900">Monthly Savings</p>
              <p className="text-xs text-indigo-600">Min: KES 350</p>
            </div>
            <input 
              type="number" 
              min="0" 
              step="1"
              placeholder="0" 
              value={amounts.savings} 
              onChange={(e) => handleAmountChange("savings", e.target.value)}
              className="w-32 rounded-lg border-2 border-indigo-200 px-3 py-2 text-black font-semibold text-right outline-none focus:border-indigo-500" 
            />
          </div>

          <div className={`flex justify-between items-center bg-gray-50 p-4 rounded-xl ${user.normalDebt <= 0 ? 'opacity-50' : ''}`}>
            <div>
              <p className="font-bold text-gray-900">Normal Loan Repayment</p>
              <p className="text-xs text-red-500">Outstanding: KES {user.normalDebt}</p>
            </div>
            <input 
              type="number" 
              min="0" 
              step="1"
              disabled={user.normalDebt <= 0} 
              placeholder="0" 
              value={amounts.normal} 
              onChange={(e) => handleAmountChange("normal", e.target.value)}
              className="w-32 rounded-lg border-2 border-gray-200 px-3 py-2 text-black font-semibold text-right outline-none focus:border-indigo-500 disabled:bg-gray-200" 
            />
          </div>

          <div className={`flex justify-between items-center bg-gray-50 p-4 rounded-xl ${user.emergencyDebt <= 0 ? 'opacity-50' : ''}`}>
            <div>
              <p className="font-bold text-gray-900">Emergency Loan Repayment</p>
              <p className="text-xs text-red-500">Outstanding: KES {user.emergencyDebt}</p>
            </div>
            <input 
              type="number" 
              min="0" 
              step="1"
              disabled={user.emergencyDebt <= 0} 
              placeholder="0" 
              value={amounts.emergency} 
              onChange={(e) => handleAmountChange("emergency", e.target.value)}
              className="w-32 rounded-lg border-2 border-gray-200 px-3 py-2 text-black font-semibold text-right outline-none focus:border-indigo-500 disabled:bg-gray-200" 
            />
          </div>

          {err && <p className="text-red-500 text-sm font-bold text-center">{err}</p>}

          <button onClick={calculateTotal} className="w-full rounded-xl bg-gray-900 py-3 font-bold text-white hover:bg-gray-800 transition">
            Calculate Total
          </button>
        </div>
      )}

      {showOptions && (
        <div className="rounded-3xl bg-white p-8 shadow-lg border border-gray-100">
          <div className="mb-6 rounded-xl bg-emerald-50 p-6 text-center border border-emerald-100">
            <p className="text-emerald-700 font-medium">Total Amount to Pay</p>
            <p className="text-4xl font-extrabold text-emerald-900 mt-1">KES {total}</p>
            <button onClick={() => setShowOptions(false)} className="mt-2 text-xs text-emerald-600 font-bold underline">Edit amounts</button>
          </div>

          <h3 className="font-bold text-gray-900 mb-4">How would you like to pay?</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button onClick={() => setMethod("self")} className={`rounded-xl border-2 p-4 text-center transition ${method === "self" ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"}`}>
              <span className="block text-2xl mb-1">📱</span>
              <span className="font-bold text-gray-900 text-sm">Pay by Myself</span>
              <span className="block text-xs text-gray-500 mt-1">Via Bank/Paybill</span>
            </button>
            <button onClick={() => setMethod("admin")} className={`rounded-xl border-2 p-4 text-center transition ${method === "admin" ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"}`}>
              <span className="block text-2xl mb-1">👨‍💼</span>
              <span className="font-bold text-gray-900 text-sm">Admin Pays for Me</span>
              <span className="block text-xs text-gray-500 mt-1">Send to Admin</span>
            </button>
          </div>

          {method && (
            <form onSubmit={handleSubmit} className="space-y-4 border-t border-gray-200 pt-6">
              <div className="bg-indigo-50 p-4 rounded-xl mb-4 text-sm">
                {method === "self" ? (
                  <>
                    <p className="font-bold text-indigo-900 mb-2">Bank/Paybill Details</p>
                    <p><strong>Paybill:</strong> {setting?.paybill || "Not set"}</p>
                    <p><strong>Account:</strong> {setting?.accountNo || "Not set"}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-indigo-900 mb-2">Send Money To Admin</p>
                    <p><strong>Phone:</strong> {setting?.sendMoneyTo || "Not set"}</p>
                    <p><strong>Name:</strong> {setting?.adminName || "Not set"}</p>
                  </>
                )}
                <p className="text-xs text-indigo-600 mt-2">After sending, fill the form below to submit for approval.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Name on Payment</label>
                  <input name="payerName" required defaultValue={user.fullName} readOnly
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 bg-gray-50 text-black font-semibold outline-none uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date Paid</label>
                  <input name="paidOn" type="date" required
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-black font-semibold outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Your ID Number</label>
                <input required defaultValue={user.idNumber} readOnly
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 bg-gray-50 text-black font-semibold outline-none" />
              </div>

              {err && <p className="text-red-500 text-sm font-bold">{err}</p>}

              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 font-bold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-50 flex justify-center items-center gap-2">
                {loading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : "Submit for Admin Approval"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}