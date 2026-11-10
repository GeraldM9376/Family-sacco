"use client";
import { useState } from "react";
import { submitBulkPayment } from "./actions";
import { useRouter } from "next/navigation";
import { fmt, fmtDate } from "@/lib/helpers";

export default function PayClient({ 
  user, 
  setting, 
  loans, 
  pendingPayments 
}: { 
  user: any, 
  setting: any, 
  loans: any[], 
  pendingPayments: any[] 
}) {
  const router = useRouter();
  const [account1Amount, setAccount1Amount] = useState("");
  const [account2Amount, setAccount2Amount] = useState("");
  const [amounts, setAmounts] = useState({ normal: "", emergency: "" });
  const [total, setTotal] = useState<number | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [method, setMethod] = useState<"self" | "admin" | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleAmountChange = (field: "normal" | "emergency", value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, "");
    setAmounts({ ...amounts, [field]: cleanValue });
  };

  const handleAcc1Change = (val: string) => setAccount1Amount(val.replace(/[^0-9]/g, ""));
  const handleAcc2Change = (val: string) => setAccount2Amount(val.replace(/[^0-9]/g, ""));

  const normalLoans = loans.filter((l: any) => l.type === "normal");
  const emergencyLoans = loans.filter((l: any) => l.type === "emergency");
  
  const normalDebt = normalLoans.reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);
  const emergencyDebt = emergencyLoans.reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const getLoanProgress = (loan: any) => {
    const paidInstallments = Math.floor(loan.paidAmount / loan.monthlyInstallment);
    const currentMonthIndex = paidInstallments;
    
    if (currentMonthIndex >= loan.periodMonths) {
      return { status: "completed", monthName: "All Paid", paid: loan.amountToPay, target: loan.monthlyInstallment };
    }

    const issuedDate = new Date(loan.issuedOn);
    const d = new Date(issuedDate);
    d.setMonth(d.getMonth() + currentMonthIndex);
    const currentMonthName = monthNames[d.getMonth()];

    const remainderFromPrevious = loan.paidAmount % loan.monthlyInstallment;
    const amountPaidIntoCurrentMonth = paidInstallments === 0 ? loan.paidAmount : remainderFromPrevious;
    const isCurrentMonthFilled = amountPaidIntoCurrentMonth >= loan.monthlyInstallment;
    const progressPct = isCurrentMonthFilled ? 100 : (amountPaidIntoCurrentMonth / loan.monthlyInstallment) * 100;

    return {
      status: "active",
      monthName: currentMonthName,
      monthNumber: currentMonthIndex + 1,
      paid: amountPaidIntoCurrentMonth,
      target: loan.monthlyInstallment,
      progressPct: progressPct
    };
  };

  const calculateTotal = () => {
    const a1 = Number(account1Amount) || 0;
    const a2 = Number(account2Amount) || 0;
    const n = Number(amounts.normal) || 0;
    const e = Number(amounts.emergency) || 0;
    
    if (a1 < 0 || a2 < 0 || n < 0 || e < 0) return setErr("Amounts cannot be negative.");
    const sum = a1 + a2 + n + e;
    if (sum <= 0) return setErr("Please enter at least one amount.");

    if (n > normalDebt) return setErr(`You cannot pay more than ${normalDebt} for normal loans.`);
    if (e > emergencyDebt) return setErr(`You cannot pay more than ${emergencyDebt} for emergency loans.`);
    
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
    fd.append("account1Amount", account1Amount || "0");
    fd.append("account2Amount", account2Amount || "0");
    fd.append("totalAmount", total?.toString() || "0");
    fd.append("normalAmt", amounts.normal || "0");
    fd.append("emergencyAmt", amounts.emergency || "0");
    fd.append("method", method || "");

    try {
      await submitBulkPayment(fd);
      window.location.href = "/dashboard/pay?msg=Payment submitted for approval";
    } catch (error: any) {
      setErr(error.message || "Something went wrong.");
      setLoading(false); 
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-10 min-h-screen">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-white">Make a Payment</h1>
      </div>

      {/* PENDING APPROVALS */}
      {pendingPayments.length > 0 && (
        <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
          <h3 className="font-bold text-amber-300 text-lg mb-4 flex items-center gap-2">
            <span>⏳</span> Pending Approvals ({pendingPayments.length})
          </h3>
          <div className="space-y-3">
            {pendingPayments.map((p: any) => {
              let breakdown: any = {};
              try { breakdown = JSON.parse(p.breakdown || "{}"); } catch (e) {}
              return (
                <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                  <div>
                    <p className="font-bold text-white">{fmt(p.totalAmount)}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {breakdown.account1 > 0 && `Acc 1: ${fmt(breakdown.account1)} `}
                      {breakdown.account2 > 0 && `| Acc 2: ${fmt(breakdown.account2)} `}
                      {breakdown.normal > 0 && `| Normal: ${fmt(breakdown.normal)} `}
                      {breakdown.emergency > 0 && `| Emergency: ${fmt(breakdown.emergency)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                      Awaiting Admin
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">{fmtDate(p.paidOn)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!showOptions && (
        <div className="rounded-3xl bg-slate-900 p-8 border border-slate-800 shadow-xl space-y-6">
          
          {/* ACCOUNTS SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.accounts.map((acc: any) => {
              const isAcc1 = acc.name === "Account 1";
              return (
                <div key={acc.id} className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
                  <p className="font-bold text-white mb-2">{acc.name} Savings</p>
                  <input 
                    type="number" min="0" step="1" placeholder="0" 
                    value={isAcc1 ? account1Amount : account2Amount} 
                    onChange={(e) => isAcc1 ? handleAcc1Change(e.target.value) : handleAcc2Change(e.target.value)}
                    className="w-full rounded-lg border-2 border-slate-600 bg-slate-900 px-3 py-2 text-white font-semibold text-right outline-none focus:border-indigo-500" 
                  />
                </div>
              );
            })}
          </div>

          {/* NORMAL LOAN */}
          {normalDebt > 0 && normalLoans.map((loan: any) => {
            const progress = getLoanProgress(loan);
            return (
              <div key={loan.id} className="flex flex-col bg-slate-800/50 p-5 rounded-xl border border-slate-700 gap-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">Normal Loan Repayment</p>
                    <p className="text-xs text-red-400">Total Owed: KES {fmt(normalDebt)}</p>
                  </div>
                  <input type="number" min="0" step="1" placeholder="0" value={amounts.normal} onChange={(e) => handleAmountChange("normal", e.target.value)}
                    className="w-32 rounded-lg border-2 border-slate-600 bg-slate-900 px-3 py-2 text-white font-semibold text-right outline-none focus:border-indigo-500" />
                </div>
                {progress.status === "active" && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-semibold">Current: Month {progress.monthNumber} ({progress.monthName})</span>
                      <span className="text-slate-400">{fmt(progress.paid)} / {fmt(progress.target)}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progress.progressPct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* EMERGENCY LOAN */}
          {emergencyDebt > 0 && emergencyLoans.map((loan: any) => {
            const progress = getLoanProgress(loan);
            return (
              <div key={loan.id} className="flex flex-col bg-slate-800/50 p-5 rounded-xl border border-slate-700 gap-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">Emergency Loan Repayment</p>
                    <p className="text-xs text-red-400">Total Owed: KES {fmt(emergencyDebt)}</p>
                  </div>
                  <input type="number" min="0" step="1" placeholder="0" value={amounts.emergency} onChange={(e) => handleAmountChange("emergency", e.target.value)}
                    className="w-32 rounded-lg border-2 border-slate-600 bg-slate-900 px-3 py-2 text-white font-semibold text-right outline-none focus:border-indigo-500" />
                </div>
                {progress.status === "active" && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-semibold">Current: Month {progress.monthNumber} ({progress.monthName})</span>
                      <span className="text-slate-400">{fmt(progress.paid)} / {fmt(progress.target)}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress.progressPct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

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
              <span className="font-bold text-white">Admin Pays</span>
            </button>
          </div>

          {method && (
            <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-800 pt-8">
              <div className="bg-slate-950 p-4 rounded-xl mb-6 text-sm border border-slate-800">
                {method === "self" ? (
                  <>
                    <p className="font-bold text-indigo-400 mb-2">Paybill Details</p>
                    <p className="text-white"><strong>Paybill:</strong> {setting?.paybill || "Not set"}</p>
                    <p className="text-white"><strong>Account:</strong> {setting?.accountNo || "Not set"}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-indigo-400 mb-2">Admin Details</p>
                    <p className="text-white"><strong>Phone:</strong> {setting?.sendMoneyTo || "Not set"}</p>
                    <p className="text-white"><strong>Name:</strong> {setting?.adminName || "Not set"}</p>
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