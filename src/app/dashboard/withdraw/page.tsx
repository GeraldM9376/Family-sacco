"use client";
import { useState } from "react";

export default function WithdrawPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [method, setMethod] = useState("send_money");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setMsg("");

    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());

    try {
      const res = await fetch("/api/dashboard/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Withdrawal failed."); setLoading(false); return; }
      
      setMsg("Withdrawal request submitted. Awaiting Admin approval.");
      setLoading(false);
    } catch (error: any) {
      setErr("Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4 md:p-10 mt-10">
      <div className="rounded-2xl bg-slate-900 p-8 border border-slate-800 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold text-white">Withdraw Contribution</h1>
        <p className="text-sm text-slate-400 mb-8">Enter amounts and choose how you want to receive the money.</p>

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

          {method !== "cash" && (
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-300">
                {method === "send_money" ? "Your M-Pesa Phone Number" : "Your Paybill & Account Number"}
              </label>
              <input 
                name="methodDetails" 
                required 
                placeholder={method === "send_money" ? "e.g. +254712345678" : "e.g. Paybill 247247, Acc 123456"}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" 
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-300">Date Requested</label>
            <input name="paidOn" type="date" required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
          </div>

          {err && <p className="text-red-400 text-sm font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">{err}</p>}

          <button disabled={loading} className="w-full rounded-lg bg-amber-600 py-3.5 font-bold text-white hover:bg-amber-500 transition disabled:opacity-50">
            {loading ? "Processing..." : "Request Withdrawal"}
          </button>
        </form>
      </div>
    </div>
  );
}