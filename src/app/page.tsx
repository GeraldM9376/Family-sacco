import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center text-center">
      <div className="mb-6 rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-bold text-indigo-700">
        Welcome to MAWEGA SACCO
      </div>
      
      <h1 className="mb-6 max-w-3xl bg-gradient-to-r from-indigo-900 via-indigo-700 to-purple-600 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-7xl">
        Build your wealth, securely.
      </h1>
      
      <p className="mb-10 max-w-xl text-lg text-gray-500">
        Manage your savings, apply for loans, and track your financial progress with Kenya's most transparent Sacco platform.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/login" className="rounded-2xl bg-indigo-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-1 hover:bg-indigo-700">
          Login to Account
        </Link>
        <Link href="/signup" className="rounded-2xl bg-white px-8 py-4 text-lg font-bold text-gray-900 shadow-xl shadow-gray-200/50 transition-all hover:-translate-y-1 hover:bg-gray-50">
          Create Account
        </Link>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 text-3xl">💰</div>
          <h3 className="mb-2 font-bold text-gray-900">Grow Savings</h3>
          <p className="text-sm text-gray-500">Track your monthly contributions and watch your savings progress bar fill up.</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 text-3xl">⚡</div>
          <h3 className="mb-2 font-bold text-gray-900">Fast Loans</h3>
          <p className="text-sm text-gray-500">Apply for normal or emergency loans and get approved instantly by the admin.</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 text-3xl">🔒</div>
          <h3 className="mb-2 font-bold text-gray-900">Bank-Level Security</h3>
          <p className="text-sm text-gray-500">Your data is encrypted and stored securely. Only you and the admin can see your details.</p>
        </div>
      </div>
    </div>
  );
}