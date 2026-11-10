import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`forgot:${ip}`, 5, 60_000))
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });

  const { idNumber } = await req.json();
  if (!idNumber) return NextResponse.json({ error: "ID Number is required." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { idNumber } });
  if (!user) return NextResponse.json({ error: "No account found with that ID." }, { status: 404 });

  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  const adminPhone = setting?.sendMoneyTo || "Admin";

  // CHECK: Does the user already have an active code?
  const existingOtp = await prisma.otp.findUnique({ where: { userId: user.id } });
  
  if (existingOtp && existingOtp.expiresAt > new Date()) {
    // DO NOT generate a new code. Just return the existing one.
    return NextResponse.json({ 
      ok: true, 
      adminPhone,
      expiresAt: existingOtp.expiresAt.toISOString(),
      message: `You already have an active code. Contact Admin at ${adminPhone} to get it.`,
      isExisting: true
    });
  }

  // Otherwise, generate a NEW code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); 

  await prisma.otp.upsert({
    where: { userId: user.id },
    update: { code, expiresAt },
    create: { userId: user.id, code, expiresAt },
  });

  return NextResponse.json({ 
    ok: true, 
    adminPhone,
    expiresAt: expiresAt.toISOString(),
    message: `Please contact Admin at ${adminPhone} to get your 6-digit reset code.`
  });
}