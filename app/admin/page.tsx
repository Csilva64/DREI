import { createClient } from '@supabase/supabase-js'
import AdminTenantsTable from './AdminTenantsTable'

async function fetchTenants() {
  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await admin
    .from('organizations')
    .select(`
      id, slug, name, plan, suspended_at, created_at,
      organization_branding (company_name, primary_color, custom_domain),
      organization_members (count)
    `)
    .order('created_at', { ascending: false })

  return data ?? []
}

export default async function AdminPage() {
  const tenants = await fetchTenants()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-slate-400 text-sm">{tenants.length} organizações</p>
        </div>
        <a
          href="/admin/tenants/new"
          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
        >
          + Novo Tenant
        </a>
      </div>
      <AdminTenantsTable tenants={tenants} />
    </div>
  )
}
