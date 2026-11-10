import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (s.user as any).id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const monthlyPayments = await prisma.payment.findMany({
    where: {
      userId,
      status: "approved",
      paidOn: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  let total = 0;
  monthlyPayments.forEach((p) => {
    try {
      const breakdown = JSON.parse(p.breakdown || "{}");
      if (breakdown.account1) total += Number(breakdown.account1);
      if (breakdown.account2) total += Number(breakdown.account2);
    } catch (e) {}
  });

  return NextResponse.json({ total });
}