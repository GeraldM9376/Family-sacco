import { adminRecordPayment } from "../../actions";
import { redirect } from "next/navigation";

export default function AdminPaymentPage() {
  async function handleSubmit(formData: FormData) {
    "use server";
    await adminRecordPayment(formData);
    redirect("/admin?msg=Payment recorded successfully");
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-lg border border-gray-100">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Record Payment for User</h1>
      <p className="mb-6 text-sm text-gray-500">Use this if a user has paid you directly (e.g., via M-Pesa) and you want to update their account immediately.</p>
      
      <form action={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">User ID Number</label>
          <input name="idNumber" required placeholder="e.g. 12345678"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-indigo-500" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">Payment Type</label>
          <select name="type" className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 bg-white">
            <option value="savings">Savings</option>
            <option value="normal">Normal Loan Repayment</option>
            <option value="emergency">Emergency Loan Repayment</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">Amount (KES)</label>
            <input name="amount" type="number" min="1" required placeholder="e.g. 1000"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">Date Paid</label>
            <input name="paidOn" type="date" required
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">Name on Payment (Caps)</label>
          <input name="payerName" required placeholder="JOHN DOE"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 uppercase" />
        </div>

        <button className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 transition">
          Record Payment Instantly
        </button>
      </form>
    </div>
  );
}