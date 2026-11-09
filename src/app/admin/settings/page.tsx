"use client";
import { useState, useEffect } from "react";
import { saveSettings } from "../actions";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [initialData, setInitialData] = useState<any>(null);

  // Fetch settings from an API route (since we can't use Prisma in a Client Component)
  useEffect(() => {
    fetch("/api/admin/get-settings")
      .then((res) => res.json())
      .then((data) => setInitialData(data))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);

    try {
      await saveSettings(fd);
      setMsg({ text: "Settings saved successfully!", type: "success" });
      setLoading(false);
    } catch (error: any) {
      setMsg({ text: error.message || "Failed to save settings.", type: "error" });
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-10">
      <div className="rounded-2xl bg-slate-900 p-8 border border-slate-800 shadow-xl mt-10">
        <h1 className="mb-2 text-2xl font-bold text-white">Payment Settings</h1>
        <p className="mb-8 text-sm text-slate-400">These details are displayed to users during payment.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">M-Pesa Paybill</label>
            <input name="paybill" defaultValue={initialData?.paybill || ""} placeholder="e.g. 247247"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Account Number</label>
            <input name="accountNo" defaultValue={initialData?.accountNo || ""} placeholder="e.g. SACCO-123"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Admin Phone (Send Money)</label>
            <input name="sendMoneyTo" defaultValue={initialData?.sendMoneyTo || ""} placeholder="e.g. +254712345678"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Admin Name</label>
            <input name="adminName" defaultValue={initialData?.adminName || ""} placeholder="e.g. John Admin"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
          </div>

          {msg && (
            <div className={`p-4 rounded-lg border font-bold text-sm ${msg.type === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
              {msg.text}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50">
            {loading ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}