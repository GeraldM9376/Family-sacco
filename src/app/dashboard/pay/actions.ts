"use server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function submitBulkPayment(formData: FormData) {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Not logged in");
  const userId = (s.user as any).id;

  const method = formData.get("method") as string;
  const payerName = (formData.get("payerName") as string).toUpperCase();
  const paidOn = new Date(formData.get("paidOn") as string);
  const totalAmount = Number(formData.get("totalAmount"));
  
  const savingsAmt = Number(formData.get("savingsAmt")) || 0;
  const normalAmt = Number(formData.get("normalAmt")) || 0;
  const emergencyAmt = Number(formData.get("emergencyAmt")) || 0;

  if (!method || !payerName || isNaN(paidOn.getTime()) || totalAmount <= 0) {
    throw new Error("Invalid payment details.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

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
}