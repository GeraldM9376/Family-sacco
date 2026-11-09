"use client";
import { useState } from "react";
import { submitBulkPayment } from "./actions";
import { useRouter } from "next/navigation";

export default function PayClient({ user, setting, loans }: { user: any, setting: any, loans: any[] }) {
  const router = useRouter();
  const [selectedAccount, setSelectedAccount] = useState<string>("");
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

  const accountLoans = loans.filter((l: any) => l.accountId === selectedAccount);
  const normalDebtForAccount = accountLoans.filter((l: any) => l.type === "normal").reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);
  const emergencyDebtForAccount = accountLoans.filter((l: any) => l.type === "emergency").reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);

  const calculateTotal = () => {
    const s = Number(amounts.savings) || 0;
    const n = Number(amounts.normal) || 0;
    const e = Number(amounts.emergency) || 0;
    
    if (s < 0 || n < 0 || e < 0) return setErr("Amounts cannot be negative.");
    const sum = s + n + e;
    if (sum <= 0) return setErr("Please enter at least one amount.");
    if (n > normalDebtForAccount) return setErr(`You cannot pay more than ${normalDebtForAccount} for normal loans in this account.`);
    if (e > emergencyDebtForAccount) return setErr(`You cannot pay more than ${emergencyDebtForAccount} for emergency loans in this account.`);
    
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
    fd.append("accountId", selectedAccount);
    fd.append("totalAmount", total?.toString() || "0");
    fd.append("savingsAmt", amounts.savings || "0");
    fd.append("normalAmt", amounts.normal || "0");
    fd.append("emergencyAmt", amounts.emergency || "0");
    fd.append("method", method || "");

    try {
      await submitBulkPayment(fd);
      window.location.href = "/dashboard?msg=Payment submitted for approval";
    } catch (error: any) {
      setErr(error.message || "Something went wrong.");
      setLoading(false); 
    }
  }

  if (!selectedAccount) {
    return (
      <div className="mx-auto max-w-lg p-4 md:p-10 mt-10">
        <h1 className="text-3xl font-extrabold text-white mb-8 text-center">Select Account</h1>
        <div className="space-y-4">
          {user.accounts.map((acc: any) => (
            <button
              key={acc.id}
              onClick={() => setSelectedAccount(acc.id)}
              className="w-full p-6 rounded-2xl border border-slate-800 bg-slate-900 text-left hover:border-indigo-500 transition shadow-lg group"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-white text-xl group-hover:text-indigo-400 transition">{acc.name}</p>
                  <p className="text-sm text-slate-400 mt-1">Balance: {acc.balance.toLocaleString()}</p>
                </div>
                <span className="text-slate-500 text-2xl group-hover:text-indigo-400 transition">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-10 min-h-screen">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-white">Make a Payment</h1>
        <p className="text-slate-400 mt-2">
          Paying to: <span className="text-indigo-400 font-bold">{user.accounts.find((a: any) => a.id === selectedAccount)?.name}</span>
        </p>
        <button onClick={() => setSelectedAccount("")} className="text-xs text-slate-500 underline mt-2 hover:text-white">Change Account</button>
      </div>

      {!showOptions && (
        <div className="rounded-3xl bg-slate-900 p-8 border border-slate-800 shadow-xl space-y-4">
          <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div>
              <p className="font-bold text-white">Monthly Savings</p>
              <p className="text-xs text-slate-400">Min: KES 350</p>
            </div>
            <input type="number" min="0" step="1" placeholder="0" value={amounts.savings} onChange={(e) => handleAmountChange("savings", e.target.value)}
              className="w-32 rounded-lg border-2 border-slate-600 bg-slate-900 px-3 py-2 text-white font-semibold text-right outline-none focus:border-indigo-500" />
          </div>

          <div className={`flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700 ${normalDebtForAccount <= 0 ? 'opacity-50' : ''}`}>
            <div>
              <p className="font-bold text-white">Normal Loan</p>
              <p className="text-xs text-red-400">Owed: KES {normalDebtForAccount}</p>
            </div>
            <input type="number" min="0" step="1" disabled={normalDebtForAccount <= 0} placeholder="0" value={amounts.normal} onChange={(e) => handleAmountChange("normal", e.target.value)}
              className="w-32 rounded-lg border-2 border-slate-600 bg-slate-900 px-3 py-2 text-white font-semibold text-right outline-none focus:border-indigo-500 disabled:bg-slate-800" />
          </div>

          <div className={`flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700 ${emergencyDebtForAccount <= 0 ? 'opacity-50' : ''}`}>
            <div>
              <p className="font-bold text-white">Emergency Loan</p>
              <p className="text-xs text-red-400">Owed: KES {emergencyDebtForAccount}</p>
            </div>
            <input type="number" min="0" step="1" disabled={emergencyDebtForAccount <= 0} placeholder="0" value={amounts.emergency} onChange={(e) => handleAmountChange("emergency", e.target.value)}
              className="w-32 rounded-lg border-2 border-slate-600 bg-slate-900 px-3 py-2 text-white font-semibold text-right outline-none focus:border-indigo-500 disabled:bg-slate-800" />
          </div>

          {err && <p className="text-red-400 text-sm font-bold text-center bg-red-500/10 p-2 rounded border border-red-500/20">{err}</p>}

          <button onClick={calculateTotal} className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-500 transition shadow-lg">
            Calculate Total
          </button>
        </div>
      )}

      {showOptions && (
        <div className="rounded-3xl bg-slate-900 p-8 border border-slate-800 shadow-xl">
          <div className="mb-8 rounded-xl bg-slate-950 p-6 text-center border border-slate-800">
            <p className="text-slate-400 font-medium">Total Amount to Pay</p>
            <p className="text-5xl font-extrabold text-white mt-2">KES {total}</p>
            <button onClick={() => setShowOptions(false)} className="mt-4 text-xs text-indigo-400 font-bold underline">Edit amounts</button>
          </div>

          <h3 className="font-bold text-white mb-4">How would you like to pay?</h3>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button onClick={() => setMethod("self")} className={`rounded-2xl border-2 p-6 text-center transition ${method === "self" ? "border-indigo-500 bg-indigo-500/10" : "border-slate-700 hover:border-indigo-500/50"}`}>
              <span className="block text-3xl mb-2">📱</span>
              <span className="font-bold text-white">Pay by Myself</span>
            </button>
            <button onClick={() => setMethod("admin")} className={`rounded-2xl border-2 p-6 text-center transition ${method === "admin" ? "border-indigo-500 bg-indigo-500/10" : "border-slate-700 hover:border-indigo-500/50"}`}>
              <span className="block text-3xl mb-2">👨‍💼</span>
              <span className="font-bold text-white">Admin Pays for Me</span>
            </button>
          </div>

          {method && (
            <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-800 pt-8">
              
              {/* PAYMENT GUIDE */}
              <div className="bg-slate-950 p-4 rounded-xl mb-6 text-sm border border-slate-800">
                {method === "self" ? (
                  <>
                    <p className="font-bold text-indigo-400 mb-2">Pay by Myself (Paybill Guide)</p>
                    <p className="text-white"><strong>Paybill:</strong> {setting?.paybill || "Not set"}</p>
                    <p className="text-white"><strong>Account:</strong> {setting?.accountNo || "Not set"}</p>
                    <p className="text-xs text-slate-500 mt-2">After sending, fill the form below to submit for approval.</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-indigo-400 mb-2">Admin Pays for Me (Send Money Guide)</p>
                    <p className="text-white"><strong>Phone:</strong> {setting?.sendMoneyTo || "Not set"}</p>
                    <p className="text-white"><strong>Name:</strong> {setting?.adminName || "Not set"}</p>
                    <p className="text-xs text-slate-500 mt-2">After sending, fill the form below to submit for approval.</p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Your Name</label>
                  <input name="payerName" required defaultValue={user.fullName} readOnly
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-400 font-semibold outline-none uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Date Paid</label>
                  <input name="paidOn" type="date" required
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white font-semibold outline-none focus:border-indigo-500" />
                </div>
              </div>

              {err && <p className="text-red-400 text-sm font-bold bg-red-500/10 p-3 rounded border border-red-500/20">{err}</p>}

              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-indigo-600 py-4 font-bold text-white shadow-lg transition hover:bg-indigo-500 disabled:opacity-50 flex justify-center items-center gap-2">
                {loading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : "Submit for Approval"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}