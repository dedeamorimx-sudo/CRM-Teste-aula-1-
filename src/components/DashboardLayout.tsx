import { type ReactNode } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'

export function DashboardLayout({
  userEmail,
  children,
}: {
  userEmail: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar userEmail={userEmail} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
