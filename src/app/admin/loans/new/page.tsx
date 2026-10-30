import { createLoan } from "../../actions";
import { redirect } from "next/navigation";

export default function NewLoanPage() {
  async function handleSubmit(formData: FormData) {
    "use server";
    await createLoan(formData);
    redirect("/admin?msg=Loan issued successfully");
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-lg border border-gray-100">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Issue New Loan</h1>
      <form action={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">User ID Number</label>
          <input name="idNumber" required placeholder="e.g. 12345678"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-indigo-500" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">Loan Type</label>
          <select name="type" className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 bg-white">
            <option value="normal">Normal Loan</option>
            <option value="emergency">Emergency Loan</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">Amount Issued (Principal)</label>
            <input name="principal" type="number" min="1" required placeholder="e.g. 5000"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">Amount to Pay (With Interest)</label>
            <input name="amountToPay" type="number" min="1" required placeholder="e.g. 5500"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">Date Issued</label>
            <input name="issuedOn" type="date" required defaultValue={new Date().toISOString().split("T")[0]}
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">Due Date</label>
            <input name="dueDate" type="date" required
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-indigo-500" />
          </div>
        </div>

        <button className="w-full rounded-xl bg-gray-900 py-3 font-bold text-white hover:bg-gray-800 transition">
          Issue Loan
        </button>
      </form>
    </div>
  );
}