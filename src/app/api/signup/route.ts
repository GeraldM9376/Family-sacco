import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/ratelimit";
import { sendWelcomeEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`signup:${ip}`, 5, 60_000))
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });

  // Notice: password and confirm are removed from frontend
  const { fullName, email, idNumber, phone } = await req.json();

  if (typeof fullName !== "string" || fullName !== fullName.toUpperCase() || !/^[A-Z\s]+$/.test(fullName))
    return NextResponse.json({ error: "Full names must be in CAPS (A-Z only)." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email))
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (!/^\d{6,10}$/.test(idNumber))
    return NextResponse.json({ error: "ID number must be 6-10 digits." }, { status: 400 });
  if (!/^\+254[17]\d{8}$/.test(phone))
    return NextResponse.json({ error: "Phone must be +2547XXXXXXXX or +2541XXXXXXXX." }, { status: 400 });

  const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { idNumber }] } });
  if (exists)
    return NextResponse.json({ error: "Email or ID already registered." }, { status: 409 });

  // Generate a strong random password (e.g. Abc#1234)
  const generatedPassword = Math.random().toString(36).slice(-4) + "A#" + Math.floor(Math.random() * 90 + 10);
  const passwordHash = await bcrypt.hash(generatedPassword, 10);
  
  await prisma.user.create({ data: { fullName, email, idNumber, phone, passwordHash } });
  
  // Email the password to the user
  await sendWelcomeEmail(email, fullName, generatedPassword);

  return NextResponse.json({ ok: true });
}