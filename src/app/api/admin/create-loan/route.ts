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
    const { idNumber, type, issuedOn, dueDate } = body;
    
    // Convert string inputs to actual numbers
    const principal = Number(body.principal);
    const amountToPay = Number(body.amountToPay);

    if (!idNumber || !type || isNaN(principal) || isNaN(amountToPay)) {
      return NextResponse.json({ error: "Invalid loan details." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { idNumber } });
    
    if (!user) {
      return NextResponse.json({ error: "Invalid User ID. No account found with this ID." }, { status: 404 });
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.loan.create({
        data: {
          userId: user.id,
          type,
          principal,      // Now a number
          amountToPay,    // Now a number
          issuedOn: new Date(issuedOn),
          dueDate: new Date(dueDate),
        },
      });

      if (type === "normal") {
        await tx.user.update({
          where: { id: user.id },
          data: { normalDebt: { increment: amountToPay } },
        });
      } else {
        await tx.user.update({
          where: { id: user.id },
          data: { emergencyDebt: { increment: amountToPay } },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to issue loan." }, { status: 500 });
  }
}