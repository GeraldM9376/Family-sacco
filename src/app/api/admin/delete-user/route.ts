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

    // 1. Check if user exists by ID
    const userById = await prisma.user.findUnique({
      where: { idNumber }
    });

    if (!userById) {
      return NextResponse.json({ error: "Invalid User ID. No account found with this ID." }, { status: 404 });
    }

    // 2. Check if phone number matches
    if (userById.phone !== phone) {
      return NextResponse.json({ error: "The phone number does not match our records for this ID." }, { status: 400 });
    }

    // 3. Delete user
    await prisma.user.delete({ where: { id: userById.id } });
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}