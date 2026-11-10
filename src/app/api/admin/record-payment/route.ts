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
    const { idNumber, payerName, paidOn } = body;
    
    const account1Amount = Number(body.account1Amount) || 0;
    const account2Amount = Number(body.account2Amount) || 0;
    const normalAmt = Number(body.normalAmt) || 0;
    const emergencyAmt = Number(body.emergencyAmt) || 0;

    const totalAmount = account1Amount + account2Amount + normalAmt + emergencyAmt;

    // Specific Validation Errors
    if (!idNumber) return NextResponse.json({ error: "User ID Number is required." }, { status: 400 });
    if (!payerName) return NextResponse.json({ error: "Payer name is required." }, { status: 400 });
    if (!paidOn) return NextResponse.json({ error: "Date paid is required." }, { status: 400 });
    if (totalAmount <= 0) return NextResponse.json({ error: "Total amount must be greater than zero." }, { status: 400 });

    const user = await prisma.user.findUnique({ 
      where: { idNumber },
      include: { accounts: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: "No user found with that ID number." }, { status: 404 });
    }

    const userLoans = await prisma.loan.findMany({
      where: { userId: user.id, status: "unpaid" },
    });

    const normalDebt = userLoans.filter(l => l.type === "normal").reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);
    const emergencyDebt = userLoans.filter(l => l.type === "emergency").reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);

    if (normalAmt > normalDebt) {
      return NextResponse.json({ error: `Cannot pay more than normal loan debt (KES ${normalDebt}).` }, { status: 400 });
    }
    if (emergencyAmt > emergencyDebt) {
      return NextResponse.json({ error: `Cannot pay more than emergency loan debt (KES ${emergencyDebt}).` }, { status: 400 });
    }

    const firstAcc = user.accounts[0];
    if (!firstAcc) return NextResponse.json({ error: "User has no accounts setup." }, { status: 400 });

    const breakdown = JSON.stringify({
      account1: account1Amount,
      account2: account2Amount,
      normal: normalAmt,
      emergency: emergencyAmt
    });

    await prisma.$transaction(async (tx: any) => {
      await tx.payment.create({
        data: {
          userId: user.id,
          accountId: firstAcc.id,
          breakdown,
          totalAmount,
          method: "admin",
          payerName: payerName.toUpperCase(),
          paidOn: new Date(paidOn),
          status: "approved",
          createdBy: "admin",
        },
      });

      if (account1Amount > 0) {
        const acc1 = user.accounts.find(a => a.name === "Account 1");
        if (acc1) await tx.account.update({ where: { id: acc1.id }, data: { balance: { increment: account1Amount } } });
      }

      if (account2Amount > 0) {
        const acc2 = user.accounts.find(a => a.name === "Account 2");
        if (acc2) await tx.account.update({ where: { id: acc2.id }, data: { balance: { increment: account2Amount } } });
      }

      if (normalAmt > 0) await distributeLoanPayment(tx, user.id, "normal", normalAmt);
      if (emergencyAmt > 0) await distributeLoanPayment(tx, user.id, "emergency", emergencyAmt);
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to record payment." }, { status: 500 });
  }
}

async function distributeLoanPayment(tx: any, userId: string, type: string, amountPaid: number) {
  let remaining = amountPaid;
  const activeLoans = await tx.loan.findMany({
    where: { userId, type, status: "unpaid" },
    orderBy: { dueDate: "asc" },
  });

  for (const loan of activeLoans) {
    if (remaining <= 0) break;
    const loanRemaining = loan.amountToPay - loan.paidAmount;
    const paymentForThisLoan = Math.min(loanRemaining, remaining);
    
    const newPaidAmount = loan.paidAmount + paymentForThisLoan;
    const isFullyPaid = newPaidAmount >= loan.amountToPay;

    await tx.loan.update({
      where: { id: loan.id },
      data: { paidAmount: newPaidAmount, status: isFullyPaid ? "paid" : "unpaid" },
    });

    remaining -= paymentForThisLoan;
  }
}