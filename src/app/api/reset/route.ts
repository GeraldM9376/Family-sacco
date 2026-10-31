import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  // Accept idNumber instead of email
  const { idNumber, code, newPassword } = await req.json();

  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,}$/.test(newPassword || ""))
    return NextResponse.json({ error: "Weak password." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { idNumber },
    include: { otp: true },
  });

  if (!user?.otp || user.otp.code !== code || user.otp.expiresAt < new Date())
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await prisma.otp.delete({ where: { userId: user.id } });

  return NextResponse.json({ ok: true });
}