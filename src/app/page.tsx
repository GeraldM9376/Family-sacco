import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-5xl font-extrabold text-transparent">
        Sacco Savings & Loans
      </h1>
      <p className="mb-8 max-w-lg text-gray-600">
        Manage your savings, loans and contributions — safely and simply.
      </p>
      <div className="flex gap-4">
        <Link href="/login" className="rounded-xl bg-indigo-600 px-6 py-3 text-white shadow hover:bg-indigo-700">
          Login
        </Link>
        <Link href="/signup" className="rounded-xl bg-white px-6 py-3 text-indigo-600 shadow hover:bg-gray-50">
          Create Account
        </Link>
      </div>
    </div>
  );
}