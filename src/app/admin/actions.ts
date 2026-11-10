"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function approvePayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { user: { include: { accounts: true } } }
  });

  if (!payment || payment.status !== "pending") return;

  let breakdown: any = {};
  try { breakdown = JSON.parse(payment.breakdown || "{}"); } catch (e) {}

  await prisma.$transaction(async (tx: any) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "approved" },
    });

    // Handle Account 1 Savings
    if (breakdown.account1 > 0) {
      const acc1 = payment.user.accounts.find((a: any) => a.name === "Account 1");
      if (acc1) {
        await tx.account.update({
          where: { id: acc1.id },
          data: { balance: { increment: Number(breakdown.account1) } },
        });
      }
    }

    // Handle Account 2 Savings
    if (breakdown.account2 > 0) {
      const acc2 = payment.user.accounts.find((a: any) => a.name === "Account 2");
      if (acc2) {
        await tx.account.update({
          where: { id: acc2.id },
          data: { balance: { increment: Number(breakdown.account2) } },
        });
      }
    }
    
    // Handle Loans (User level)
    if (breakdown.normal > 0) {
      await distributeLoanPayment(tx, payment.userId, "normal", Number(breakdown.normal));
    }
    if (breakdown.emergency > 0) {
      await distributeLoanPayment(tx, payment.userId, "emergency", Number(breakdown.emergency));
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  revalidatePath("/dashboard");
}

export async function rejectPayment(paymentId: string, reason: string) {
  if (!reason) throw new Error("Reason is required");
  
  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "rejected", rejectReason: reason },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  revalidatePath("/dashboard");
}

export async function saveSettings(formData: FormData) {
  const paybill = formData.get("paybill") as string;
  const accountNo = formData.get("accountNo") as string;
  const sendMoneyTo = formData.get("sendMoneyTo") as string;
  const adminName = formData.get("adminName") as string;

  await prisma.setting.upsert({
    where: { id: 1 },
    update: { paybill, accountNo, sendMoneyTo, adminName },
    create: { id: 1, paybill, accountNo, sendMoneyTo, adminName },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/dashboard/pay");
}

export async function createLoan(formData: FormData) {
  const idNumber = formData.get("idNumber") as string;
  const type = formData.get("type") as string; 
  const principal = Number(formData.get("principal"));
  const amountToPay = Number(formData.get("amountToPay"));
  const periodMonths = Number(formData.get("periodMonths"));
  const issuedOn = new Date(formData.get("issuedOn") as string);
  const dueDate = new Date(formData.get("dueDate") as string);

  if (!idNumber || !type || isNaN(principal) || isNaN(amountToPay) || isNaN(periodMonths)) {
    throw new Error("Invalid loan details");
  }

  const user = await prisma.user.findUnique({ 
    where: { idNumber },
    include: { accounts: true }
  });
  if (!user) throw new Error("User with that ID does not exist.");
  
  const firstAcc = user.accounts[0];
  if (!firstAcc) throw new Error("User has no accounts.");

  const monthlyInstallment = amountToPay / periodMonths;

  await prisma.loan.create({
    data: {
      userId: user.id,
      accountId: firstAcc.id,
      type,
      principal,
      amountToPay,
      periodMonths,
      monthlyInstallment,
      issuedOn,
      dueDate,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
}

// UPDATED: Specific Error Messages for Admin Payment
export async function adminRecordPayment(formData: FormData) {
  const idNumber = formData.get("idNumber") as string;
  const payerName = (formData.get("payerName") as string).toUpperCase();
  const paidOn = new Date(formData.get("paidOn") as string);
  
  const account1Amount = Number(formData.get("account1Amount")) || 0;
  const account2Amount = Number(formData.get("account2Amount")) || 0;
  const normalAmt = Number(formData.get("normalAmt")) || 0;
  const emergencyAmt = Number(formData.get("emergencyAmt")) || 0;
  
  const totalAmount = account1Amount + account2Amount + normalAmt + emergencyAmt;

  // Specific Validation Errors
  if (!idNumber) throw new Error("User ID Number is required.");
  if (!payerName) throw new Error("Payer name is required.");
  if (isNaN(paidOn.getTime())) throw new Error("Please select a valid Date Paid.");
  if (totalAmount <= 0) throw new Error("Please enter an amount greater than 0.");

  const user = await prisma.user.findUnique({ 
    where: { idNumber },
    include: { accounts: true }
  });
  if (!user) throw new Error("User with that ID does not exist.");

  const firstAcc = user.accounts[0];
  if (!firstAcc) throw new Error("User has no accounts.");

  const userLoans = await prisma.loan.findMany({
    where: { userId: user.id, status: "unpaid" },
  });

  const normalDebt = userLoans.filter(l => l.type === "normal").reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);
  const emergencyDebt = userLoans.filter(l => l.type === "emergency").reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);

  if (normalAmt > normalDebt) throw new Error(`Cannot pay more than normal loan debt (KES ${normalDebt}).`);
  if (emergencyAmt > emergencyDebt) throw new Error(`Cannot pay more than emergency loan debt (KES ${emergencyDebt}).`);

  await prisma.$transaction(async (tx: any) => {
    const breakdown = JSON.stringify({
      account1: account1Amount,
      account2: account2Amount,
      normal: normalAmt,
      emergency: emergencyAmt
    });
    
    await tx.payment.create({
      data: {
        userId: user.id,
        accountId: firstAcc.id,
        breakdown,
        totalAmount,
        method: "admin",
        payerName,
        paidOn,
        status: "approved",
        createdBy: "admin",
      },
    });

    if (account1Amount > 0) {
      const acc1 = user.accounts.find(a => a.name === "Account 1");
      if (acc1) {
        await tx.account.update({
          where: { id: acc1.id },
          data: { balance: { increment: account1Amount } },
        });
      }
    }

    if (account2Amount > 0) {
      const acc2 = user.accounts.find(a => a.name === "Account 2");
      if (acc2) {
        await tx.account.update({
          where: { id: acc2.id },
          data: { balance: { increment: account2Amount } },
        });
      }
    }

    if (normalAmt > 0) await distributeLoanPayment(tx, user.id, "normal", normalAmt);
    if (emergencyAmt > 0) await distributeLoanPayment(tx, user.id, "emergency", emergencyAmt);
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
}

export async function approveWithdrawal(withdrawalId: string) {
  const w = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { user: { include: { accounts: true } } }
  });
  if (!w || w.status !== "pending") return;

  const acc1 = w.user.accounts.find(a => a.name === "Account 1");
  const acc2 = w.user.accounts.find(a => a.name === "Account 2");

  await prisma.$transaction(async (tx: any) => {
    await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { 
        status: "approved",
        approvedAt: new Date(),
      },
    });

    if (w.account1Amt > 0 && acc1) {
      await tx.account.update({
        where: { id: acc1.id },
        data: { balance: { decrement: w.account1Amt } },
      });
    }

    if (w.account2Amt > 0 && acc2) {
      await tx.account.update({
        where: { id: acc2.id },
        data: { balance: { decrement: w.account2Amt } },
      });
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/withdrawals");
  revalidatePath("/dashboard");
}

// Helper to distribute payment across user's loans
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
      data: {
        paidAmount: newPaidAmount,
        status: isFullyPaid ? "paid" : "unpaid",
      },
    });

    remaining -= paymentForThisLoan;
  }
}