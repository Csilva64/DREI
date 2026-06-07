import { createClient } from '@supabase/supabase-js'
import { OPCO_ORG_ID } from '@/lib/tenant'

export function getAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdmin = new Proxy({} as any, {
  get(_t, prop) {
    return (getAdmin() as any)[prop]
  },
}) as ReturnType<typeof getAdmin>

export async function verifyUser(authHeader: string | null): Promise<{
  valid: boolean
  userId: string | null
  orgId: string | null
  role: string | null
}> {
  if (!authHeader?.startsWith('Bearer ')) return { valid: false, userId: null, orgId: null, role: null }
  const token = authHeader.slice(7)
  const admin = getAdmin()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return { valid: false, userId: null, orgId: null, role: null }

  // Resolve org from DB (reliable — no dependency on JWT hook).
  // Order by created_at DESC so the user's OWN org (newest membership) wins
  // deterministically over the seeded OPCO membership.
  const { data: member } = await (admin as any)
    .from('organization_members')
    .select('organization_id, role, created_at')
    .eq('user_id', data.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    valid: true,
    userId: data.user.id,
    orgId: member?.organization_id ?? null,
    role: member?.role ?? null,
  }
}

export async function recalculateKPIs(organizationId?: string): Promise<void> {
  const admin = getAdmin()
  const orgId = organizationId ?? OPCO_ORG_ID
  const { data: revenue } = await (admin as any).from('monthly_revenue').select('*').eq('organization_id', orgId)
  if (!revenue?.length) return
  const totalRevenue = revenue.reduce((s: number, r: any) => s + Number(r.revenue), 0)
  const monthlyAverage = totalRevenue / revenue.length
  const best = revenue.reduce((a: any, b: any) => Number(a.revenue) > Number(b.revenue) ? a : b)
  // Total repasses = sum of operator columns across months (matches the table/pie)
  const totalPayouts = revenue.reduce((s: number, r: any) =>
    s + Number(r.opco) + Number(r.sabrina) + Number(r.giovani) + Number(r.gabriella), 0)
  const total2025 = revenue.filter((r: any) => Number(r.year) === 2025).reduce((s: number, r: any) => s + Number(r.revenue), 0)
  const total2026 = revenue.filter((r: any) => Number(r.year) === 2026).reduce((s: number, r: any) => s + Number(r.revenue), 0)
  const yoyGrowth = total2025 > 0 ? ((total2026 - total2025) / total2025) * 100 : 0

  const payload = {
    organization_id: orgId,
    total_revenue: totalRevenue,
    best_month: best.month,
    best_month_value: Number(best.revenue),
    monthly_average: monthlyAverage,
    total_payouts: totalPayouts,
    yoy_growth: Math.round(yoyGrowth * 10) / 10,
  }

  // Update-or-insert by org WITHOUT relying on a DB unique constraint:
  // delete any existing KPI rows for this org, then insert one clean row.
  await (admin as any).from('dashboard_kpis').delete().eq('organization_id', orgId)
  await (admin as any).from('dashboard_kpis').insert(payload)
}

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}
