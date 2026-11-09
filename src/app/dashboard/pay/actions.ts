"use server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function submitBulkPayment(formData: FormData) {
  try {
    const s = await getServerSession(authOptions);
    if (!s?.user) throw new Error("You must be logged in.");
    const userId = (s.user as any).id;

    const accountId = formData.get("accountId") as string;
    const method = formData.get("method") as string;
    const payerName = (formData.get("payerName") as string).toUpperCase();
    const paidOnStr = formData.get("paidOn") as string;
    const totalAmount = Number(formData.get("totalAmount"));
    
    const savingsAmt = Number(formData.get("savingsAmt")) || 0;
    const normalAmt = Number(formData.get("normalAmt")) || 0;
    const emergencyAmt = Number(formData.get("emergencyAmt")) || 0;

    if (!accountId || !method || !payerName || !paidOnStr || totalAmount <= 0) {
      throw new Error("Invalid payment details. Please check the form.");
    }

    if (savingsAmt < 0 || normalAmt < 0 || emergencyAmt < 0) {
      throw new Error("Payment amounts cannot be negative.");
    }

    const paidOn = new Date(paidOnStr);
    if (isNaN(paidOn.getTime())) throw new Error("Invalid date selected.");

    // Validate the account belongs to this user
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new Error("Account not found.");

    // Calculate the outstanding debt for THIS account specifically
    const accountLoans = await prisma.loan.findMany({
      where: { accountId, userId, status: "unpaid" },
    });

    const normalDebt = accountLoans
      .filter(l => l.type === "normal")
      .reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);
    
    const emergencyDebt = accountLoans
      .filter(l => l.type === "emergency")
      .reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);

    if (normalAmt > normalDebt) throw new Error("Cannot pay more than your normal loan debt in this account.");
    if (emergencyAmt > emergencyDebt) throw new Error("Cannot pay more than your emergency loan debt in this account.");

    const breakdown = JSON.stringify({
      savings: savingsAmt,
      normal: normalAmt,
      emergency: emergencyAmt
    });

    await prisma.payment.create({
      data: {
        userId,
        accountId,
        breakdown,
        totalAmount,
        method,
        payerName,
        paidOn,
        status: "pending",
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/pay");
    
    return { success: true };
  } catch (error: any) {
    console.error("PAYMENT ERROR:", error.message);
    throw new Error(error.message || "Failed to submit payment. Try again.");
  }
}