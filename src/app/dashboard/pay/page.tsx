import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fmt } from "@/lib/helpers";
import { submitPayment } from "./actions";
import { redirect } from "next/navigation";
import { connection } from "next/server"; // 1. Added

export default async function PayPage() {
  // 2. Added to prevent prerender errors
  await connection();

  const s = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: (s!.user as any).id },
  });
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });

  if (!user) return null;

  async function handleSubmit(formData: FormData) {
    "use server";
    await submitPayment(formData);
    redirect("/dashboard?msg=Payment submitted for approval");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Make a Payment</h1>
        <p className="text-gray-500 mt-1">Select what you are paying for and enter the amount.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Paybill Details Sidebar */}
        <div className="md:col-span-1 rounded-2xl bg-indigo-50 p-6 border border-indigo-100 h-fit">
          <h2 className="font-bold text-indigo-900 mb-4">Admin Payment Details</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-indigo-600 font-medium">Paybill Number</p>
              <p className="font-mono text-lg font-bold text-gray-900">{setting?.paybill || "Not set"}</p>
            </div>
            <div>
              <p className="text-indigo-600 font-medium">Account Number</p>
              <p className="font-mono text-lg font-bold text-gray-900">{setting?.accountNo || "Not set"}</p>
            </div>
            <div>
              <p className="text-indigo-600 font-medium">Send Money To</p>
              <p className="font-mono text-lg font-bold text-gray-900">{setting?.sendMoneyTo || "Not set"}</p>
            </div>
            <div>
              <p className="text-indigo-600 font-medium">Admin Name</p>
              <p className="text-lg font-bold text-gray-900">{setting?.adminName || "Not set"}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-indigo-700 bg-indigo-100 p-3 rounded-lg">
            Make the payment using M-Pesa, then fill the form on the right to submit proof.
          </p>
        </div>

        {/* Payment Form */}
        <div className="md:col-span-2 rounded-2xl bg-white p-6 shadow-lg border border-gray-100">
          <form action={handleSubmit} className="space-y-5">
            
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">What are you paying for?</label>
              <div className="grid gap-3">
                
                {/* Savings Option */}
                <label className="relative flex cursor-pointer rounded-xl border-2 p-4 hover:bg-gray-50 transition">
                  <input type="radio" name="type" value="savings" required className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                  <div className="ml-4 flex flex-col">
                    <span className="font-bold text-gray-900">Monthly Savings</span>
                    <span className="text-sm text-gray-500">Add to your savings (Min: KES 350)</span>
                  </div>
                </label>

                {/* Normal Loan Option */}
                <label className={`relative flex rounded-xl border-2 p-4 transition ${user.normalDebt > 0 ? 'cursor-pointer hover:bg-gray-50' : 'opacity-50 cursor-not-allowed bg-gray-100'}`}>
                  <input type="radio" name="type" value="normal" required disabled={user.normalDebt <= 0} className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50" />
                  <div className="ml-4 flex flex-col">
                    <span className="font-bold text-gray-900 flex items-center gap-2">
                      Normal Loan Repayment
                      {user.normalDebt <= 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">No Debt</span>}
                    </span>
                    <span className={`text-sm ${user.normalDebt > 0 ? "text-red-500 font-medium" : "text-gray-500"}`}>
                      Outstanding: {fmt(user.normalDebt)}
                    </span>
                  </div>
                </label>

                {/* Emergency Loan Option */}
                <label className={`relative flex rounded-xl border-2 p-4 transition ${user.emergencyDebt > 0 ? 'cursor-pointer hover:bg-gray-50' : 'opacity-50 cursor-not-allowed bg-gray-100'}`}>
                  <input type="radio" name="type" value="emergency" required disabled={user.emergencyDebt <= 0} className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50" />
                  <div className="ml-4 flex flex-col">
                    <span className="font-bold text-gray-900 flex items-center gap-2">
                      Emergency Loan Repayment
                      {user.emergencyDebt <= 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">No Debt</span>}
                    </span>
                    <span className={`text-sm ${user.emergencyDebt > 0 ? "text-red-500 font-medium" : "text-gray-500"}`}>
                      Outstanding: {fmt(user.emergencyDebt)}
                    </span>
                  </div>
                </label>

              </div>
            </div>

            <hr className="border-gray-200" />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">Amount Paid (KES)</label>
                <input name="amount" type="number" min="1" required placeholder="e.g. 1000"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">Date Paid</label>
                {/* 3. Removed dynamic date here */}
                <input name="paidOn" type="date" required
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-indigo-500" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-gray-700">Name on Payment (Caps)</label>
              <input name="payerName" required placeholder="JOHN DOE" defaultValue={user.fullName}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 uppercase" />
            </div>

            <button type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 font-bold text-white shadow-lg transition hover:scale-[1.02]">
              Submit Payment for Approval
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}