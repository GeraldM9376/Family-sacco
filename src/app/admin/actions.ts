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