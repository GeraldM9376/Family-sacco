import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s || (s.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { idNumber, phone, confirmation } = await req.json();

    if (confirmation !== "DELETE") {
      return NextResponse.json({ error: "You must type DELETE to confirm." }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { idNumber, phone }
    });

    if (!user) {
      return NextResponse.json({ error: "User ID and Phone number do not match our records." }, { status: 404 });
    }

    await prisma.user.delete({ where: { id: user.id } });
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete user." }, { status: 500 });
  }
}