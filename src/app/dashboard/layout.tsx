import { type ReactNode } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/server'

export default async function Layout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <DashboardLayout userEmail={user?.email ?? ''}>{children}</DashboardLayout>
  )
}
