"use client";
import { useState, useEffect } from "react";
import { fmt, fmtDate } from "@/lib/helpers";

export default function WithdrawPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [method, setMethod] = useState("send_money");
  
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  
  // NEW: Fetch user's savings progress
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0);

  const fetchData = async () => {
    try {
      // Fetch withdrawal history
      const res = await fetch("/api/dashboard/withdraw");
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(data);
      }

      // Fetch current month's savings progress
      const dashRes = await fetch("/api/dashboard/current-savings");
      if (dashRes.ok) {
        const dashData = await dashRes.json();
        setCurrentMonthTotal(dashData.total || 0);
      }
    } catch (e) {
      console.error("Failed to fetch data", e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setMsg("");

    const fd = new FormData(e.currentTarget);
    
    let methodDetails = fd.get("methodDetails") as string;
    if (method === "paybill") {
      const paybill = fd.get("paybill") as string;
      const accNo = fd.get("accountNo") as string;
      methodDetails = `Paybill: ${paybill}, Account: ${accNo}`;
    }

    const body = {
      account1Amt: fd.get("account1Amt"),
      account2Amt: fd.get("account2Amt"),
      method,
      methodDetails,
    };

    try {
      const res = await fetch("/api/dashboard/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      
      if (!res.ok) { 
        setErr(data.error || "Withdrawal failed."); 
        setLoading(false); 
        return; 
      }
      
      setMsg("Withdrawal request submitted. Awaiting Admin approval.");
      (e.target as HTMLFormElement).reset();
      fetchData();
      setLoading(false);
    } catch (error: any) {
      setErr("Something went wrong.");
      setLoading(false);
    }
  }

  const pending = withdrawals.filter(w => w.status === "pending");
  const history = withdrawals.filter(w => w.status !== "pending");
  
  const savingsPct = Math.min(100, (currentMonthTotal / 350) * 100);
  const savingsColor = savingsPct < 30 ? "bg-red-500" : savingsPct < 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-10 mt-10 space-y-8">
      
      {/* PENDING WITHDRAWALS */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
          <h2 className="text-lg font-bold text-amber-300 mb-4 flex items-center gap-2">
            <span>⏳</span> Pending Withdrawals ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((w: any) => (
              <div key={w.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">{fmt(w.totalAmount)}</p>
                  <p className="text-xs text-slate-400">
                    {w.account1Amt > 0 && `Acc 1: ${fmt(w.account1Amt)} `}
                    {w.account2Amt > 0 && `| Acc 2: ${fmt(w.account2Amt)}`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Via: {w.methodDetails}</p>
                </div>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                  Awaiting Admin
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WITHDRAWAL FORM */}
      <div className="rounded-2xl bg-slate-900 p-8 border border-slate-800 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold text-white">Withdraw Contribution</h1>
        <p className="text-sm text-slate-400 mb-6">Enter amounts and choose how you want to receive the money.</p>

        {/* Current Month Progress Visual */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>This Month's Savings Progress (Target: 350)</span>
            <span className="font-bold text-white">{Math.round(savingsPct)}%</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full ${savingsColor} transition-all duration-500`} style={{ width: `${savingsPct}%` }} />
          </div>
        </div>

        {msg && <div className="bg-emerald-500/20 text-emerald-400 p-3 rounded-lg mb-4 text-sm font-bold border border-emerald-500/30">{msg}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-300">From Account 1</label>
              <input name="account1Amt" type="number" min="0" placeholder="0" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-300">From Account 2</label>
              <input name="account2Amt" type="number" min="0" placeholder="0" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-300">Receive Money Via</label>
            <select 
              name="method" 
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
            >
              <option value="send_money">M-Pesa Send Money</option>
              <option value="paybill">Paybill Refund</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          {method === "send_money" && (
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-300">Your M-Pesa Phone Number</label>
              <input name="methodDetails" required placeholder="e.g. +254712345678" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
            </div>
          )}

          {method === "paybill" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-300">Paybill Number</label>
                <input name="paybill" required placeholder="e.g. 247247" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-300">Account Number</label>
                <input name="accountNo" required placeholder="e.g. 123456" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
              </div>
            </div>
          )}

          {err && <p className="text-red-400 text-sm font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">{err}</p>}

          <button disabled={loading} className="w-full rounded-lg bg-amber-600 py-3.5 font-bold text-white hover:bg-amber-500 transition disabled:opacity-50">
            {loading ? "Processing..." : "Request Withdrawal"}
          </button>
        </form>
      </div>

      {/* WITHDRAWAL HISTORY */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">Withdrawal History</h2>
        </div>
        {fetching ? (
          <p className="p-8 text-center text-slate-400">Loading history...</p>
        ) : history.length === 0 ? (
          <p className="p-8 text-center text-slate-400">No past withdrawals found.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {history.map((w: any) => (
              <div key={w.id} className="p-4 flex justify-between items-center hover:bg-slate-800/30 transition">
                <div>
                  <p className="font-bold text-white">{fmt(w.totalAmount)}</p>
                  <p className="text-xs text-slate-400">
                    {w.account1Amt > 0 && `Acc 1: ${fmt(w.account1Amt)} `}
                    {w.account2Amt > 0 && `| Acc 2: ${fmt(w.account2Amt)}`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{w.methodDetails}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Requested: {fmtDate(w.createdAt)}
                    {w.approvedAt && ` • Approved: ${fmtDate(w.approvedAt)}`}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${w.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                  {w.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}