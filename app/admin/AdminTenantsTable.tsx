'use client'

interface Tenant {
  id: string
  slug: string
  name: string
  plan: string
  suspended_at: string | null
  created_at: string
  organization_branding: any
}

export default function AdminTenantsTable({ tenants }: { tenants: Tenant[] }) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400 text-left">
            <th className="px-4 py-3 font-medium">Tenant</th>
            <th className="px-4 py-3 font-medium">Slug</th>
            <th className="px-4 py-3 font-medium">Plano</th>
            <th className="px-4 py-3 font-medium">Domínio</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Criado</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {tenants.map(t => (
            <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 font-semibold text-white">{t.name}</td>
              <td className="px-4 py-3 text-slate-400 font-mono text-xs">{t.slug}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  t.plan === 'pro' ? 'bg-orange-500/20 text-orange-400' :
                  t.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {t.plan}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-400 text-xs">
                {(Array.isArray(t.organization_branding) ? t.organization_branding[0] : t.organization_branding)?.custom_domain ?? '—'}
              </td>
              <td className="px-4 py-3">
                <span className={`w-2 h-2 rounded-full inline-block ${t.suspended_at ? 'bg-red-500' : 'bg-emerald-500'}`} />
                <span className="ml-2 text-xs text-slate-400">{t.suspended_at ? 'Suspenso' : 'Ativo'}</span>
              </td>
              <td className="px-4 py-3 text-slate-500 text-xs">
                {new Date(t.created_at).toLocaleDateString('pt-BR')}
              </td>
              <td className="px-4 py-3">
                <a
                  href={`/admin/tenants/${t.id}`}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Gerenciar →
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
