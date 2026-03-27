import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const role = session.user.role?.toLowerCase()
  
  const roleRedirects: Record<string, string> = {
    superadmin: '/superadmin',
    admin: '/admin',
    manager: '/manager',
    submanager: '/manager',
    kitchen: '/kitchen',
    waiter: '/waiter',
  }

  const target = roleRedirects[role] || '/login'
  redirect(target)
}
