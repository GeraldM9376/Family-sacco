import { prisma } from "@/lib/prisma";
import { saveSettings } from "../actions";
import { connection } from "next/server";

export default async function SettingsPage() {
  await connection();

  const setting = await prisma.setting.findUnique({ where: { id: 1 } });

  async function handleSubmit(formData: FormData) {
    "use server";
    await saveSettings(formData);
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl bg-slate-900 p-8 shadow-lg border border-slate-800 mt-10">
      <h1 className="mb-2 text-2xl font-bold text-white">Payment Settings</h1>
      <p className="mb-6 text-sm text-slate-400">These details will be displayed to users when they go to make a payment.</p>

      <form action={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-300">M-Pesa Paybill Number</label>
          <input name="paybill" defaultValue={setting?.paybill || ""} placeholder="e.g. 247247"
            className="w-full rounded-xl border-2 border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-300">Account Number</label>
          <input name="accountNo" defaultValue={setting?.accountNo || ""} placeholder="e.g. SACCO-123"
            className="w-full rounded-xl border-2 border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-300">Send Money Phone Number</label>
          <input name="sendMoneyTo" defaultValue={setting?.sendMoneyTo || ""} placeholder="e.g. +254712345678"
            className="w-full rounded-xl border-2 border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-300">Admin Name (for confirmation)</label>
          <input name="adminName" defaultValue={setting?.adminName || ""} placeholder="e.g. John Admin"
            className="w-full rounded-xl border-2 border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
        </div>

        <button className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-500 transition">
          Save Settings
        </button>
      </form>
    </div>
  );
}