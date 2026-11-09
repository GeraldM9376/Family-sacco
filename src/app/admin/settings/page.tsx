import { prisma } from "@/lib/prisma";
import { connection } from "next/server";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  await connection();
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-10">
      <div className="rounded-2xl bg-slate-900 p-8 border border-slate-800 shadow-xl mt-10">
        <h1 className="mb-2 text-2xl font-bold text-white">Payment Settings</h1>
        <p className="mb-8 text-sm text-slate-400">These details are displayed to users during payment.</p>
        <SettingsForm initialData={setting} />
      </div>
    </div>
  );
}