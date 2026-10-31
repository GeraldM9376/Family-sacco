import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { connection } from "next/server";
import PayClient from "./PayClient";

export default async function PayPage() {
  await connection();

  const s = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({ where: { id: (s!.user as any).id } });
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });

  if (!user) return null;

  return (
    <div className="text-slate-200">
      <PayClient user={user} setting={setting || {}} />
    </div>
  );
}