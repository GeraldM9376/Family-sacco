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
    const { idNumber, accountName, type, payerName, paidOn } = body;
    const amount = Number(body.amount);

    if (!idNumber || !accountName || !type || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment details." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ 
      where: { idNumber },
      include: { accounts: true }
    });
    if (!user) {
      return NextResponse.json({ error: "Invalid User ID. No account found." }, { status: 404 });
    }

    // Find the target account (Account 1 or Account 2)
    const targetAccount = user.accounts.find(a => a.name === accountName);
    if (!targetAccount) {
      return NextResponse.json({ error: "Account not found for this user." }, { status: 404 });
    }

    // Fetch loans belonging to this account to validate
    const accountLoans = await prisma.loan.findMany({
      where: { accountId: targetAccount.id, userId: user.id, status: "unpaid" },
    });

    const normalDebt = accountLoans
      .filter(l => l.type === "normal")
      .reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);
    
    const emergencyDebt = accountLoans
      .filter(l => l.type === "emergency")
      .reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);

    if (type === "normal" && amount > normalDebt) {
      return NextResponse.json({ error: `Cannot pay more than normal loan debt (KES ${normalDebt}).` }, { status: 400 });
    }
    if (type === "emergency" && amount > emergencyDebt) {
      return NextResponse.json({ error: `Cannot pay more than emergency loan debt (KES ${emergencyDebt}).` }, { status: 400 });
    }

    await prisma.$transaction(async (tx: any) => {
      const breakdown = JSON.stringify({ [type]: amount });
      
      // 1. Create the payment record
      await tx.payment.create({
        data: {
          userId: user.id,
          accountId: targetAccount.id,
          breakdown,
          totalAmount: amount,
          method: "admin",
          payerName: payerName.toUpperCase(),
          paidOn: new Date(paidOn),
          status: "approved",
          createdBy: "admin",
        },
      });

      // 2. Update the correct account balance for savings
      if (type === "savings") {
        await tx.account.update({
          where: { id: targetAccount.id },
          data: { balance: { increment: amount } },
        });
      } 
      // 3. Distribute to loans if it's a loan repayment
      else if (type === "normal" || type === "emergency") {
        await distributeLoanPayment(tx, targetAccount.id, type, amount);
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to record payment." }, { status: 500 });
  }
}

// Helper to update specific loans inside a specific account
async function distributeLoanPayment(tx: any, accountId: string, type: string, amountPaid: number) {
  let remaining = amountPaid;
  const activeLoans = await tx.loan.findMany({
    where: { accountId, type, status: "unpaid" },
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
      data: {
        paidAmount: newPaidAmount,
        status: isFullyPaid ? "paid" : "unpaid",
      },
    });

    remaining -= paymentForThisLoan;
  }
}