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

  // Password strength meter
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
    
    // Show specific error if form is invalid
    if (!isValidName) return setMsg({ text: "Full name must be in CAPS and at least 3 characters.", type: "error" });
    if (!isValidEmail) return setMsg({ text: "Enter a valid email address.", type: "error" });
    if (!isValidId) return setMsg({ text: "ID number must be 6-10 digits.", type: "error" });
    if (!isValidPhone) return setMsg({ text: "Phone number must be +2547XXXXXXXX or +2541XXXXXXXX.", type: "error" });
    if (!isValidPass) return setMsg({ text: "Password must be 8+ chars with Uppercase, Lowercase, Number, and Symbol.", type: "error" });
    if (!doPasswordsMatch) return setMsg({ text: "Passwords do not match.", type: "error" });

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
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-sm text-slate-400 mt-1">Join MAWEGA SACCO.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Full Name (Caps)</label>
            <div className="relative">
              <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="JOHN DOE" required
                className={`w-full rounded-lg border bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none transition-all focus:border-indigo-500 ${form.fullName ? (isValidName ? 'border-emerald-500' : 'border-red-500') : 'border-slate-700'}`} />
              <InputStatus isValid={isValidName} value={form.fullName} />
            </div>
            {form.fullName && !isValidName && <p className="text-xs text-red-400 mt-1">Only CAPS letters and spaces allowed.</p>}
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Email Address</label>
            <div className="relative">
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="john@gmail.com" required
                className={`w-full rounded-lg border bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none transition-all focus:border-indigo-500 ${form.email ? (isValidEmail ? 'border-emerald-500' : 'border-red-500') : 'border-slate-700'}`} />
              <InputStatus isValid={isValidEmail} value={form.email} />
            </div>
            {form.email && !isValidEmail && <p className="text-xs text-red-400 mt-1">Enter a valid email (e.g. john@gmail.com).</p>}
          </div>

          {/* ID & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">ID Number</label>
              <input name="idNumber" value={form.idNumber} onChange={handleChange} placeholder="12345678" required
                className={`w-full rounded-lg border bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none transition-all focus:border-indigo-500 ${form.idNumber ? (isValidId ? 'border-emerald-500' : 'border-red-500') : 'border-slate-700'}`} />
              {form.idNumber && !isValidId && <p className="text-xs text-red-400 mt-1">Must be 6-10 digits.</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Phone Number</label>
              <div className="relative">
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="+254712345678" required
                  className={`w-full rounded-lg border bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none transition-all focus:border-indigo-500 ${form.phone ? (isValidPhone ? 'border-emerald-500' : 'border-red-500') : 'border-slate-700'}`} />
                <InputStatus isValid={isValidPhone} value={form.phone} />
              </div>
              {form.phone && !isValidPhone && <p className="text-xs text-red-400 mt-1">Format: +2547XXXXXXXX</p>}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Password</label>
            <div className="relative">
              <input name="password" type={showPass ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="••••••••" required
                className={`w-full rounded-lg border bg-slate-950 px-4 py-3 pr-12 text-white placeholder-slate-600 outline-none transition-all focus:border-indigo-500 ${form.password ? (isValidPass ? 'border-emerald-500' : 'border-amber-500') : 'border-slate-700'}`} />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-slate-400 hover:text-white">
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
            {/* Password Strength Bar */}
            {form.password && (
              <div className="mt-2">
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full ${strengthColor} transition-all duration-300`} style={{ width: `${strength}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">Must be 8+ chars with Uppercase, Number, and Symbol.</p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Confirm Password</label>
            <div className="relative">
              <input name="confirm" type={showConfirm ? "text" : "password"} value={form.confirm} onChange={handleChange} placeholder="••••••••" required
                className={`w-full rounded-lg border bg-slate-950 px-4 py-3 pr-12 text-white placeholder-slate-600 outline-none transition-all focus:border-indigo-500 ${form.confirm ? (doPasswordsMatch ? 'border-emerald-500' : 'border-red-500') : 'border-slate-700'}`} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-3 text-slate-400 hover:text-white">
                {showConfirm ? "🙈" : "👁️"}
              </button>
              <InputStatus isValid={doPasswordsMatch} value={form.confirm} />
            </div>
            {form.confirm && !doPasswordsMatch && <p className="text-xs text-red-400 mt-1">Passwords do not match.</p>}
          </div>

          <Message text={msg?.text} type={msg?.type} />

          <button disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50 mt-2">
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already registered? <Link href="/login" className="text-indigo-400 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}