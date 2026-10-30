"use server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function submitPayment(formData: FormData) {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Not logged in");
  const userId = (s.user as any).id;

  const type = formData.get("type") as string;
  const amount = Number(formData.get("amount"));
  const payerName = (formData.get("payerName") as string).toUpperCase();
  const paidOn = new Date(formData.get("paidOn") as string);

  if (!type || isNaN(amount) || amount <= 0 || !payerName || isNaN(paidOn.getTime())) {
    throw new Error("Invalid payment details.");
  }

  // Double check: Prevent loan payment if no debt (Security check)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  if (type === "normal" && user.normalDebt <= 0) throw new Error("You have no normal loan debt.");
  if (type === "emergency" && user.emergencyDebt <= 0) throw new Error("You have no emergency loan debt.");

  await prisma.payment.create({
    data: {
      userId,
      type,
      amount,
      payerName,
      paidOn,
      status: "pending",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/pay");
}