"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function approvePayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { user: true },
  });

  if (!payment || payment.status !== "pending") return;

  const { userId, type, amount } = payment;

  await prisma.$transaction(async (tx) => {
    // 1. Update the Payment Status
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "approved" },
    });

    // 2. Update User Totals
    if (type === "savings") {
      await tx.user.update({
        where: { id: userId },
        data: { savingsTotal: { increment: amount } },
      });
    } else if (type === "normal") {
      // Prevent debt from going below 0
      const newDebt = Math.max(0, payment.user.normalDebt - amount);
      await tx.user.update({
        where: { id: userId },
        data: { normalDebt: newDebt },
      });
      await distributeLoanPayment(tx, userId, "normal", amount);
    } else if (type === "emergency") {
      const newDebt = Math.max(0, payment.user.emergencyDebt - amount);
      await tx.user.update({
        where: { id: userId },
        data: { emergencyDebt: newDebt },
      });
      await distributeLoanPayment(tx, userId, "emergency", amount);
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  revalidatePath("/dashboard");
}

// Helper to distribute payment across active loans
async function distributeLoanPayment(tx: any, userId: string, type: string, amountPaid: number) {
  let remaining = amountPaid;
  const activeLoans = await tx.loan.findMany({
    where: { userId, type, status: "unpaid" },
    orderBy: { dueDate: "asc" }, // Pay oldest loans first
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

// ---------- ADMIN: ISSUE LOAN ----------
export async function createLoan(formData: FormData) {
  const idNumber = formData.get("idNumber") as string;
  const type = formData.get("type") as string; // normal or emergency
  const principal = Number(formData.get("principal"));
  const amountToPay = Number(formData.get("amountToPay"));
  const issuedOn = new Date(formData.get("issuedOn") as string);
  const dueDate = new Date(formData.get("dueDate") as string);

  if (!idNumber || !type || isNaN(principal) || isNaN(amountToPay)) {
    throw new Error("Invalid loan details");
  }

  const user = await prisma.user.findUnique({ where: { idNumber } });
  if (!user) throw new Error("User not found");

  await prisma.$transaction(async (tx) => {
    // 1. Create the loan record
    await tx.loan.create({
      data: {
        userId: user.id,
        type,
        principal,
        amountToPay,
        issuedOn,
        dueDate,
      },
    });

    // 2. Add to the user's total debt
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

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
}

// ---------- ADMIN: RECORD PAYMENT FOR USER ----------
export async function adminRecordPayment(formData: FormData) {
  const idNumber = formData.get("idNumber") as string;
  const type = formData.get("type") as string;
  const amount = Number(formData.get("amount"));
  const payerName = (formData.get("payerName") as string).toUpperCase();
  const paidOn = new Date(formData.get("paidOn") as string);

  if (!idNumber || !type || isNaN(amount) || amount <= 0) {
    throw new Error("Invalid payment details");
  }

  const user = await prisma.user.findUnique({ where: { idNumber } });
  if (!user) throw new Error("User not found");

  await prisma.$transaction(async (tx) => {
    // 1. Create the payment as APPROVED immediately
    await tx.payment.create({
      data: {
        userId: user.id,
        type,
        amount,
        payerName,
        paidOn,
        status: "approved",
        createdBy: "admin",
      },
    });

    // 2. Update the user's totals
    if (type === "savings") {
      await tx.user.update({
        where: { id: user.id },
        data: { savingsTotal: { increment: amount } },
      });
    } else if (type === "normal") {
      const newDebt = Math.max(0, user.normalDebt - amount);
      await tx.user.update({
        where: { id: user.id },
        data: { normalDebt: newDebt },
      });
      await distributeLoanPayment(tx, user.id, "normal", amount);
    } else if (type === "emergency") {
      const newDebt = Math.max(0, user.emergencyDebt - amount);
      await tx.user.update({
        where: { id: user.id },
        data: { emergencyDebt: newDebt },
      });
      await distributeLoanPayment(tx, user.id, "emergency", amount);
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
}

// ---------- ADMIN: SAVE SETTINGS ----------
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