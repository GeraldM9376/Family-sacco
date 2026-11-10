import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { connection } from "next/server";
import PayClient from "./PayClient";

export default async function PayPage() {
  await connection();

  const s = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: (s!.user as any).id },
    include: { accounts: true },
  });
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });

  if (!user) return null;

  // Fetch active loans AND pending payments
  const loans = await prisma.loan.findMany({
    where: { userId: user.id, status: "unpaid" },
  });

  const pendingPayments = await prisma.payment.findMany({
    where: { userId: user.id, status: "pending" },
    orderBy: { createdAt: "desc" },
    include: { account: true },
  });

  return (
    <PayClient 
      user={user} 
      setting={setting || {}} 
      loans={loans} 
      pendingPayments={pendingPayments} 
    />
  );
}