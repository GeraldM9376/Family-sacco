"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function approvePayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { user: true },
  });

  if (!payment || payment.status !== "pending") return;

  const { userId } = payment;
  const breakdown = JSON.parse(payment.breakdown || "{}");

  await prisma.$transaction(async (tx: any) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "approved" },
    });

    if (breakdown.savings > 0) {
      await tx.user.update({
        where: { id: userId },
        data: { savingsTotal: { increment: breakdown.savings } },
      });
    }
    if (breakdown.normal > 0) {
      const newDebt = Math.max(0, payment.user.normalDebt - breakdown.normal);
      await tx.user.update({
        where: { id: userId },
        data: { normalDebt: newDebt },
      });
      await distributeLoanPayment(tx, userId, "normal", breakdown.normal);
    }
    if (breakdown.emergency > 0) {
      const newDebt = Math.max(0, payment.user.emergencyDebt - breakdown.emergency);
      await tx.user.update({
        where: { id: userId },
        data: { emergencyDebt: newDebt },
      });
      await distributeLoanPayment(tx, userId, "emergency", breakdown.emergency);
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
  const issuedOn = new Date(formData.get("issuedOn") as string);
  const dueDate = new Date(formData.get("dueDate") as string);

  if (!idNumber || !type || isNaN(principal) || isNaN(amountToPay)) {
    throw new Error("Invalid loan details");
  }

  const user = await prisma.user.findUnique({ where: { idNumber } });
  if (!user) throw new Error("User with that ID does not exist.");

  await prisma.$transaction(async (tx: any) => {
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
  if (!user) throw new Error("User with that ID does not exist.");

  if (type === "normal" && amount > user.normalDebt) throw new Error("Cannot pay more than the normal loan debt.");
  if (type === "emergency" && amount > user.emergencyDebt) throw new Error("Cannot pay more than the emergency loan debt.");

  await prisma.$transaction(async (tx: any) => {
    // Create as a bulk payment for consistency
    const breakdown = JSON.stringify({ [type]: amount });
    
    await tx.payment.create({
      data: {
        userId: user.id,
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

export async function deleteUser(formData: FormData) {
  const idNumber = formData.get("idNumber") as string;
  const phone = formData.get("phone") as string;
  const confirmation = formData.get("confirmation") as string;

  if (confirmation !== "DELETE") {
    throw new Error("You must type DELETE to confirm.");
  }

  const user = await prisma.user.findFirst({
    where: { idNumber, phone }
  });

  if (!user) {
    throw new Error("User ID and Phone number do not match our records.");
  }

  await prisma.user.delete({ where: { id: user.id } });
  revalidatePath("/admin/users");
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
      data: {
        paidAmount: newPaidAmount,
        status: isFullyPaid ? "paid" : "unpaid",
      },
    });

    remaining -= paymentForThisLoan;
  }
}