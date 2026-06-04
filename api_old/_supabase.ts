import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export function authenticate(apiKey: string | string[] | undefined): boolean {
  if (!process.env.INGEST_API_KEY) return false
  return apiKey === process.env.INGEST_API_KEY
}

export async function recalculateKPIs(): Promise<void> {
  const { data: revenue } = await supabase.from('monthly_revenue').select('*')
  const { data: payouts } = await supabase.from('operator_payouts').select('total')

  if (!revenue?.length) return

  const totalRevenue = revenue.reduce((s, r) => s + Number(r.revenue), 0)
  const monthlyAverage = totalRevenue / revenue.length
  const best = revenue.reduce((a, b) => Number(a.revenue) > Number(b.revenue) ? a : b)
  const totalPayouts = payouts?.reduce((s, p) => s + Number(p.total), 0) ?? 0

  await supabase.from('dashboard_kpis').upsert({
    id: 1,
    total_revenue: totalRevenue,
    best_month: best.month,
    best_month_value: Number(best.revenue),
    monthly_average: monthlyAverage,
    total_payouts: totalPayouts,
    yoy_growth: 0,
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
