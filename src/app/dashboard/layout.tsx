import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const s = await getServerSession(authOptions);
  
  if (!s?.user) redirect("/login");
  if ((s.user as any).role === "admin") redirect("/admin");
  
  return <>{children}</>;
}