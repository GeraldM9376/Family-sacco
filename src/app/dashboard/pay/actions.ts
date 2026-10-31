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

    const method = formData.get("method") as string;
    const payerName = (formData.get("payerName") as string).toUpperCase();
    const paidOnStr = formData.get("paidOn") as string;
    const totalAmount = Number(formData.get("totalAmount"));
    
    const savingsAmt = Number(formData.get("savingsAmt")) || 0;
    const normalAmt = Number(formData.get("normalAmt")) || 0;
    const emergencyAmt = Number(formData.get("emergencyAmt")) || 0;

    // 1. Basic validation
    if (!method || !payerName || !paidOnStr || totalAmount <= 0) {
      throw new Error("Invalid payment details. Please check the form.");
    }

    // 2. Prevent negative numbers on the backend
    if (savingsAmt < 0 || normalAmt < 0 || emergencyAmt < 0) {
      throw new Error("Payment amounts cannot be negative.");
    }

    const paidOn = new Date(paidOnStr);
    if (isNaN(paidOn.getTime())) throw new Error("Invalid date selected.");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found.");

    // 3. Prevent overpaying loans
    if (normalAmt > user.normalDebt) throw new Error("Cannot pay more than your normal loan debt.");
    if (emergencyAmt > user.emergencyDebt) throw new Error("Cannot pay more than your emergency loan debt.");

    const breakdown = JSON.stringify({
      savings: savingsAmt,
      normal: normalAmt,
      emergency: emergencyAmt
    });

    await prisma.payment.create({
      data: {
        userId,
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
    // Throw the error message so the frontend can display it
    throw new Error(error.message || "Failed to submit payment. Try again.");
  }
}