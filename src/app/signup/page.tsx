"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Message } from "@/components/Message";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    idNumber: "",
    phone: "",
    password: "",
    confirm: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    const name = e.target.name;
    
    if (name === "fullName") val = val.toUpperCase();
    if (name === "email") val = val.toLowerCase();
    if (name === "phone") {
      val = val.replace(/\s+/g, "");
      if (val.startsWith("07") || val.startsWith("01")) val = "+254" + val.substring(1);
    }
    if (name === "idNumber") val = val.replace(/\D/g, ""); 
    
    setForm({ ...form, [name]: val });
  };

  const isValidName = /^[A-Z\s]+$/.test(form.fullName) && form.fullName.length > 2;
  const isValidEmail = /^\S+@\S+\.\S+$/.test(form.email);
  const isValidId = /^\d{6,10}$/.test(form.idNumber);
  const isValidPhone = /^\+254[17]\d{8}$/.test(form.phone);
  const isValidPass = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,}$/.test(form.password);
  const doPasswordsMatch = form.password === form.confirm && form.confirm !== "";

  const getPassStrength = () => {
    let score = 0;
    if (form.password.length >= 8) score += 25;
    if (/[A-Z]/.test(form.password)) score += 25;
    if (/\d/.test(form.password)) score += 25;
    if (/\W/.test(form.password)) score += 25;
    return score;
  };
  const strength = getPassStrength();
  const strengthColor = strength <= 25 ? "bg-red-500" : strength <= 75 ? "bg-amber-500" : "bg-emerald-500";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValidName || !isValidEmail || !isValidId || !isValidPhone || !isValidPass || !doPasswordsMatch) {
      return setMsg({ text: "Please fix the errors above before submitting.", type: "error" });
    }

    setMsg(null);
    setLoading(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) return setMsg({ text: data.error, type: "error" });
    
    setMsg({ text: "Account created! Password sent to your email. Redirecting...", type: "success" });
    setTimeout(() => router.push("/login"), 2500);
  }

  const InputStatus = ({ isValid, value }: { isValid: boolean; value: string }) => {
    if (!value) return null;
    return isValid ? <span className="absolute right-3 top-3 text-emerald-500">✓</span> : <span className="absolute right-3 top-3 text-red-500">✗</span>;
  };

  return (
    <div className="flex min-h-[80vh] overflow-hidden rounded-3xl bg-white shadow-2xl mx-auto max-w-5xl mt-6">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-indigo-700 via-purple-600 to-pink-500 p-12 text-white md:flex relative">
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold tracking-tight">Join MAWEGA SACCO.</h2>
          <p className="mt-4 text-lg text-indigo-100">
            Secure your future with Kenya's most transparent savings and loan platform.
          </p>
        </div>
      </div>

      <div className="w-full p-8 md:w-1/2 lg:p-12 relative overflow-y-auto">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Create Account</h1>
        <p className="mb-8 text-sm text-gray-500">Already have an account? <Link href="/login" className="font-semibold text-indigo-600 hover:underline">Log in</Link></p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Full Name (Caps)</label>
            <div className="relative">
              <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="JOHN DOE" required
                className={`w-full rounded-xl border-2 px-4 py-3 text-black font-semibold outline-none transition-all focus:border-indigo-500 ${form.fullName ? (isValidName ? 'border-emerald-500' : 'border-red-300') : 'border-gray-200'}`} />
              <InputStatus isValid={isValidName} value={form.fullName} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email Address</label>
            <div className="relative">
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="john@gmail.com" required
                className={`w-full rounded-xl border-2 px-4 py-3 text-black font-semibold outline-none transition-all focus:border-indigo-500 ${form.email ? (isValidEmail ? 'border-emerald-500' : 'border-red-300') : 'border-gray-200'}`} />
              <InputStatus isValid={isValidEmail} value={form.email} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ID Number</label>
              <input name="idNumber" value={form.idNumber} onChange={handleChange} placeholder="12345678" required
                className={`w-full rounded-xl border-2 px-4 py-3 text-black font-semibold outline-none transition-all focus:border-indigo-500 ${form.idNumber ? (isValidId ? 'border-emerald-500' : 'border-red-300') : 'border-gray-200'}`} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
              <div className="relative">
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="+254712345678" required
                  className={`w-full rounded-xl border-2 px-4 py-3 text-black font-semibold outline-none transition-all focus:border-indigo-500 ${form.phone ? (isValidPhone ? 'border-emerald-500' : 'border-red-300') : 'border-gray-200'}`} />
                <InputStatus isValid={isValidPhone} value={form.phone} />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input name="password" type={showPass ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="••••••••" required
                className={`w-full rounded-xl border-2 px-4 py-3 text-black font-semibold pr-12 outline-none transition-all focus:border-indigo-500 ${form.password ? (isValidPass ? 'border-emerald-500' : 'border-amber-300') : 'border-gray-200'}`} />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-700">
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
            {form.password && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className={`h-full ${strengthColor} transition-all duration-300`} style={{ width: `${strength}%` }} />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirm Password</label>
            <div className="relative">
              <input name="confirm" type={showConfirm ? "text" : "password"} value={form.confirm} onChange={handleChange} placeholder="••••••••" required
                className={`w-full rounded-xl border-2 px-4 py-3 text-black font-semibold pr-12 outline-none transition-all focus:border-indigo-500 ${form.confirm ? (doPasswordsMatch ? 'border-emerald-500' : 'border-red-300') : 'border-gray-200'}`} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-700">
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <Message text={msg?.text} type={msg?.type} />

          <button disabled={loading}
            className="w-full transform rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-indigo-500/30 active:scale-95 disabled:opacity-60 flex justify-center items-center gap-2">
            {loading ? (
              <><span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> Creating Account…</>
            ) : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}