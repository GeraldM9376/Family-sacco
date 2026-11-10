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
    
    const account1Amount = Number(formData.get("account1Amount")) || 0;
    const account2Amount = Number(formData.get("account2Amount")) || 0;
    const normalAmt = Number(formData.get("normalAmt")) || 0;
    const emergencyAmt = Number(formData.get("emergencyAmt")) || 0;

    if (!method || !payerName || !paidOnStr || totalAmount <= 0) {
      throw new Error("Invalid payment details.");
    }

    const paidOn = new Date(paidOnStr);
    if (isNaN(paidOn.getTime())) throw new Error("Invalid date selected.");

    // Validate user's loans (Account independent)
    const userLoans = await prisma.loan.findMany({
      where: { userId, status: "unpaid" },
    });
    const normalDebt = userLoans.filter(l => l.type === "normal").reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);
    const emergencyDebt = userLoans.filter(l => l.type === "emergency").reduce((sum, l) => sum + (l.amountToPay - l.paidAmount), 0);

    if (normalAmt > normalDebt) throw new Error("Cannot pay more than your normal loan debt.");
    if (emergencyAmt > emergencyDebt) throw new Error("Cannot pay more than your emergency loan debt.");

    // Attach payment to user's first account to satisfy DB relation
    const firstAcc = await prisma.account.findFirst({ where: { userId } });
    if (!firstAcc) throw new Error("User has no accounts.");

    const breakdown = JSON.stringify({
      account1: account1Amount,
      account2: account2Amount,
      normal: normalAmt,
      emergency: emergencyAmt
    });

    await prisma.payment.create({
      data: {
        userId,
        accountId: firstAcc.id,
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