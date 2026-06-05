import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const isPlatformAdmin = user.user_metadata?.is_platform_admin === true
  if (!isPlatformAdmin) redirect('/')

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center gap-6">
        <span className="text-orange-500 font-bold text-lg">⚡ Platform Admin</span>
        <a href="/admin" className="text-sm text-slate-400 hover:text-white transition-colors">Tenants</a>
        <a href="/admin/domains" className="text-sm text-slate-400 hover:text-white transition-colors">Domínios</a>
        <a href="/" className="ml-auto text-sm text-slate-400 hover:text-white transition-colors">← Dashboard</a>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
