import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s || (s.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { idNumber, type, payerName, paidOn } = body;
    
    // Convert string input to actual number
    const amount = Number(body.amount);

    if (!idNumber || !type || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment details." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { idNumber } });
    if (!user) {
      return NextResponse.json({ error: "Invalid User ID. No account found." }, { status: 404 });
    }

    if (type === "normal" && amount > user.normalDebt) return NextResponse.json({ error: "Cannot pay more than normal loan debt." }, { status: 400 });
    if (type === "emergency" && amount > user.emergencyDebt) return NextResponse.json({ error: "Cannot pay more than emergency loan debt." }, { status: 400 });

    await prisma.$transaction(async (tx: any) => {
      const breakdown = JSON.stringify({ [type]: amount });
      
      await tx.payment.create({
        data: {
          userId: user.id,
          breakdown,
          totalAmount: amount,
          method: "admin",
          payerName: payerName.toUpperCase(),
          paidOn: new Date(paidOn),
          status: "approved",
          createdBy: "admin",
        },
      });

      if (type === "savings") {
        await tx.user.update({ where: { id: user.id }, data: { savingsTotal: { increment: amount } } });
      } else if (type === "normal") {
        const newDebt = Math.max(0, user.normalDebt - amount);
        await tx.user.update({ where: { id: user.id }, data: { normalDebt: newDebt } });
      } else if (type === "emergency") {
        const newDebt = Math.max(0, user.emergencyDebt - amount);
        await tx.user.update({ where: { id: user.id }, data: { emergencyDebt: newDebt } });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to record payment." }, { status: 500 });
  }
}