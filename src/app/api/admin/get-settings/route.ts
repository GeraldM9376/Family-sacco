import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s || (s.user as any).role !== "admin") return NextResponse.json({}, { status: 401 });

  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  return NextResponse.json(setting || {});
}
