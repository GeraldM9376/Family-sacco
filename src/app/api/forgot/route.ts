import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtp } from "@/lib/mailer";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`forgot:${ip}`, 5, 60_000))
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    return NextResponse.json({ error: "No account with that email." }, { status: 404 });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otp.upsert({
    where: { userId: user.id },
    update: { code, expiresAt },
    create: { userId: user.id, code, expiresAt },
  });

  await sendOtp(email, code);
  return NextResponse.json({ ok: true });
}