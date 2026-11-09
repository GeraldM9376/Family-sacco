import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtp } from "@/lib/mailer";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`forgot:${ip}`, 5, 60_000))
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });

  const { idNumber } = await req.json();
  if (!idNumber) return NextResponse.json({ error: "ID Number is required." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { idNumber } });
  if (!user) return NextResponse.json({ error: "No account found with that ID." }, { status: 404 });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 HOUR expiry

  await prisma.otp.upsert({
    where: { userId: user.id },
    update: { code, expiresAt },
    create: { userId: user.id, code, expiresAt },
  });

  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  const adminPhone = setting?.sendMoneyTo || "Admin";

  // Log the code to the Vercel console so the Admin can see it
  console.log(`🔐 PASSWORD RESET CODE for ${user.fullName} (${user.idNumber}): ${code}`);

  return NextResponse.json({ 
    ok: true, 
    adminPhone,
    message: `Please contact Admin at ${adminPhone} to get your 6-digit reset code.`
  });
}