import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/ratelimit";
import { sendWelcomeEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`signup:${ip}`, 5, 60_000))
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });

  const { fullName, email, idNumber, phone, password, confirm } = await req.json();

  if (typeof fullName !== "string" || fullName !== fullName.toUpperCase() || !/^[A-Z\s]+$/.test(fullName))
    return NextResponse.json({ error: "Full names must be in CAPS." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email))
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (!/^\d{6,10}$/.test(idNumber))
    return NextResponse.json({ error: "ID number must be 6-10 digits." }, { status: 400 });
  if (!/^\+254[17]\d{8}$/.test(phone))
    return NextResponse.json({ error: "Phone must be +2547XXXXXXXX." }, { status: 400 });
  if (password !== confirm)
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,}$/.test(password))
    return NextResponse.json({ error: "Weak password." }, { status: 400 });

  const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { idNumber }] } });
  if (exists)
    return NextResponse.json({ error: "Email or ID already registered." }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { fullName, email, idNumber, phone, passwordHash } });
  
  // Send the password they typed to their email
  await sendWelcomeEmail(email, fullName, password);

  return NextResponse.json({ ok: true });
}