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

  // Find the user by ID Number instead of Email
  const user = await prisma.user.findUnique({ where: { idNumber } });
  if (!user)
    return NextResponse.json({ error: "No account found with that ID Number." }, { status: 404 });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await prisma.otp.upsert({
    where: { userId: user.id },
    update: { code, expiresAt },
    create: { userId: user.id, code, expiresAt },
  });

  // Send the code to the email saved in their database profile
  await sendOtp(user.email, code);
  
  return NextResponse.json({ ok: true, email: user.email });
}