import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s || (s.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const otps = await prisma.otp.findMany({
    where: { expiresAt: { gt: new Date() } },
    include: { user: true },
    orderBy: { expiresAt: "asc" },
  });

  return NextResponse.json(otps);
}