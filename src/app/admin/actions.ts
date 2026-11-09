"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function approvePayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment || payment.status !== "pending") return;

  const { userId, accountId } = payment;
  let breakdown: any = {};
  try { breakdown = JSON.parse(payment.breakdown || "{}"); } catch (e) {}

  await prisma.$transaction(async (tx: any) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "approved" },
    });

    // Savings go to the Account balance
    if (breakdown.savings > 0) {
      await tx.account.update({
        where: { id: accountId },
        data: { balance: { increment: Number(breakdown.savings) } },
      });
    }
    
    // Loan payments distribute to specific loan records on that account
    if (breakdown.normal > 0) {
      await distributeLoanPayment(tx, accountId, "normal", Number(breakdown.normal));
    }
    if (breakdown.emergency > 0) {
      await distributeLoanPayment(tx, accountId, "emergency", Number(breakdown.emergency));
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
  const accountName = formData.get("accountName") as string;
  const principal = Number(formData.get("principal"));
  const amountToPay = Number(formData.get("amountToPay"));
  const periodMonths = Number(formData.get("periodMonths"));
  const issuedOn = new Date(formData.get("issuedOn") as string);
  const dueDate = new Date(formData.get("dueDate") as string);

  if (!idNumber || !type || !accountName || isNaN(principal) || isNaN(amountToPay) || isNaN(periodMonths)) {
    throw new Error("Invalid loan details");
  }

  const user = await prisma.user.findUnique({ 
    where: { idNumber },
    include: { accounts: true }
  });
  if (!user) throw new Error("User with that ID does not exist.");

  const targetAccount = user.accounts.find(a => a.name === accountName);
  if (!targetAccount) throw new Error("Account not found for this user.");

  const monthlyInstallment = amountToPay / periodMonths;

  await prisma.loan.create({
    data: {
      userId: user.id,
      accountId: targetAccount.id,
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

export async function adminRecordPayment(formData: FormData) {
  const idNumber = formData.get("idNumber") as string;
  const accountName = formData.get("accountName") as string;
  const type = formData.get("type") as string;
  const amount = Number(formData.get("amount"));
  const payerName = (formData.get("payerName") as string).toUpperCase();
  const paidOn = new Date(formData.get("paidOn") as string);

  if (!idNumber || !accountName || !type || isNaN(amount) || amount <= 0) {
    throw new Error("Invalid payment details");
  }

  const user = await prisma.user.findUnique({ 
    where: { idNumber },
    include: { accounts: true }
  });
  if (!user) throw new Error("User with that ID does not exist.");

  const targetAccount = user.accounts.find(a => a.name === accountName);
  if (!targetAccount) throw new Error("Account not found for this user.");

  // Fetch this account's loans to validate
  const accountLoans = await prisma.loan.findMany({
    where: { accountId: targetAccount.id, userId: user.id, status: "unpaid" },
  });

  const normalDebt = accountLoans
    .filter(l => l.type === "normal")
    .reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);
  
  const emergencyDebt = accountLoans
    .filter(l => l.type === "emergency")
    .reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);

  if (type === "normal" && amount > normalDebt) throw new Error(`Cannot pay more than normal loan debt (KES ${normalDebt}).`);
  if (type === "emergency" && amount > emergencyDebt) throw new Error(`Cannot pay more than emergency loan debt (KES ${emergencyDebt}).`);

  await prisma.$transaction(async (tx: any) => {
    const breakdown = JSON.stringify({ [type]: amount });
    
    await tx.payment.create({
      data: {
        userId: user.id,
        accountId: targetAccount.id,
        breakdown,
        totalAmount: amount,
        method: "admin",
        payerName,
        paidOn,
        status: "approved",
        createdBy: "admin",
      },
    });

    if (type === "savings") {
      await tx.account.update({
        where: { id: targetAccount.id },
        data: { balance: { increment: amount } },
      });
    } else if (type === "normal" || type === "emergency") {
      await distributeLoanPayment(tx, targetAccount.id, type, amount);
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
}

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