import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getCurrentSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  if (!session?.user) return null;
  return {
    id: (session.user as any).id,
    email: session.user.email,
    name: session.user.name,
  };
}