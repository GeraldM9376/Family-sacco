import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (s.user as any).id;

  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(withdrawals);
}

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (s.user as any).id;

  try {
    const body = await req.json();
    const a1 = Number(body.account1Amt) || 0;
    const a2 = Number(body.account2Amt) || 0;
    const method = body.method;
    const methodDetails = body.methodDetails || "";
    const paidOn = new Date(body.paidOn);
    const total = a1 + a2;

    if (total <= 0) return NextResponse.json({ error: "Enter an amount to withdraw." }, { status: 400 });
    if (!method || !paidOn || isNaN(paidOn.getTime())) return NextResponse.json({ error: "Invalid details." }, { status: 400 });
    if (method !== "cash" && !methodDetails) return NextResponse.json({ error: "Please provide the receiving details." }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: true }
    });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const acc1 = user.accounts.find(a => a.name === "Account 1");
    const acc2 = user.accounts.find(a => a.name === "Account 2");

    if (a1 > (acc1?.balance || 0)) return NextResponse.json({ error: "Insufficient funds in Account 1." }, { status: 400 });
    if (a2 > (acc2?.balance || 0)) return NextResponse.json({ error: "Insufficient funds in Account 2." }, { status: 400 });

    await prisma.withdrawal.create({
      data: {
        userId,
        account1Amt: a1,
        account2Amt: a2,
        totalAmount: total,
        method,
        methodDetails,
        paidOn,
        status: "pending",
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Withdrawal failed." }, { status: 500 });
  }
}