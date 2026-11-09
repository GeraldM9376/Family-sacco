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
    <div className="mx-auto max-w-2xl p-4 md:p-10">
      <div className="rounded-3xl bg-slate-900 p-8 border border-slate-800 shadow-xl mt-10">
        <h1 className="mb-2 text-2xl font-bold text-white">Payment Settings</h1>
        <p className="mb-8 text-sm text-slate-400">These details are displayed to users during payment.</p>

        <form action={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-300">M-Pesa Paybill</label>
            <input name="paybill" defaultValue={setting?.paybill || ""} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-300">Account Number</label>
            <input name="accountNo" defaultValue={setting?.accountNo || ""} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-300">Admin Phone (Send Money)</label>
            <input name="sendMoneyTo" defaultValue={setting?.sendMoneyTo || ""} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-300">Admin Name</label>
            <input name="adminName" defaultValue={setting?.adminName || ""} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500" />
          </div>
          <button className="w-full rounded-xl bg-indigo-600 py-3.5 font-bold text-white hover:bg-indigo-500 transition">
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}