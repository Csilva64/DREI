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

export async function verifyUser(authHeader: string | null): Promise<{ valid: boolean; orgId: string | null }> {
  if (!authHeader?.startsWith('Bearer ')) return { valid: false, orgId: null }
  const token = authHeader.slice(7)
  const { data, error } = await getAdmin().auth.getUser(token)
  if (error || !data.user) return { valid: false, orgId: null }
  // Extract org_id from JWT claims
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return { valid: true, orgId: payload.organization_id ?? null }
  } catch {
    return { valid: true, orgId: null }
  }
}

export async function recalculateKPIs(organizationId?: string): Promise<void> {
  const admin = getAdmin()
  const orgId = organizationId ?? OPCO_ORG_ID
  const { data: revenue } = await (admin as any).from('monthly_revenue').select('*').eq('organization_id', orgId)
  const { data: payouts } = await (admin as any).from('operator_payouts').select('total').eq('organization_id', orgId)
  if (!revenue?.length) return
  const totalRevenue = revenue.reduce((s: number, r: any) => s + Number(r.revenue), 0)
  const monthlyAverage = totalRevenue / revenue.length
  const best = revenue.reduce((a: any, b: any) => Number(a.revenue) > Number(b.revenue) ? a : b)
  const totalPayouts = payouts?.reduce((s: number, p: any) => s + Number(p.total), 0) ?? 0
  const total2025 = revenue.filter((r: any) => Number(r.year) === 2025).reduce((s: number, r: any) => s + Number(r.revenue), 0)
  const total2026 = revenue.filter((r: any) => Number(r.year) === 2026).reduce((s: number, r: any) => s + Number(r.revenue), 0)
  const yoyGrowth = total2025 > 0 ? ((total2026 - total2025) / total2025) * 100 : 0
  await (admin as any).from('dashboard_kpis').upsert({
    organization_id: orgId,
    total_revenue: totalRevenue,
    best_month: best.month,
    best_month_value: Number(best.revenue),
    monthly_average: monthlyAverage,
    total_payouts: totalPayouts,
    yoy_growth: Math.round(yoyGrowth * 10) / 10,
  })
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
