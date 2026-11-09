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
    
    const principal = Number(body.principal);
    const amountToPay = Number(body.amountToPay);
    const periodMonths = Number(body.periodMonths);

    if (!idNumber || !type || isNaN(principal) || isNaN(amountToPay) || isNaN(periodMonths)) {
      return NextResponse.json({ error: "Invalid loan details." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ 
      where: { idNumber },
      include: { accounts: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: "Invalid User ID." }, { status: 404 });
    }

    // Since a loan is user-based, we attach it to their first account silently
    const primaryAccount = user.accounts[0];
    if (!primaryAccount) {
      return NextResponse.json({ error: "User has no accounts setup." }, { status: 400 });
    }

    const monthlyInstallment = amountToPay / periodMonths;

    await prisma.loan.create({
      data: {
        userId: user.id,
        accountId: primaryAccount.id,
        type,
        principal,
        amountToPay,
        periodMonths,
        monthlyInstallment,
        issuedOn: new Date(issuedOn),
        dueDate: new Date(dueDate),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to issue loan." }, { status: 500 });
  }
}