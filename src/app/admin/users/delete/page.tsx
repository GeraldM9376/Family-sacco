import { deleteUser } from "../../actions";
import { redirect } from "next/navigation";
import Link from "next/link";

export default function DeleteUserPage() {
  async function handleDelete(formData: FormData) {
    "use server";
    await deleteUser(formData);
    redirect("/admin/users?msg=User deleted successfully");
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-lg border border-red-100">
      <h1 className="mb-2 text-2xl font-bold text-red-600">Delete User</h1>
      <p className="mb-6 text-sm text-gray-500">This action is permanent and will delete all their loans and payments.</p>

      <form action={handleDelete} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">User ID Number</label>
          <input name="idNumber" required placeholder="e.g. 12345678"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-red-500" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">Phone Number</label>
          <input name="phone" required placeholder="+254712345678"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-red-500" />
        </div>

        <div className="pt-4 border-t border-gray-200">
          <label className="mb-1 block text-sm font-bold text-gray-700">Type <strong>DELETE</strong> to confirm</label>
          <input name="confirmation" required placeholder="DELETE"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-red-500 uppercase" />
        </div>

        <button className="w-full rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700 transition">
          Permanently Delete User
        </button>
        <Link href="/admin/users" className="block text-center text-sm font-bold text-gray-500 mt-4 hover:underline">Cancel</Link>
      </form>
    </div>
  );
}