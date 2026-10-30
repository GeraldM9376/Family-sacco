import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getServerSession(authOptions);
  if (!s || (s.user as any).role !== "admin") redirect("/login");
  return <>{children}</>;
}