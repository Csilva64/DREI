import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyUser(authHeader: string | undefined): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.slice(7)
  const { data, error } = await supabase.auth.getUser(token)
  return !error && !!data.user
}

async function recalculateKPIs(): Promise<void> {
  const { data: revenue } = await supabase.from('monthly_revenue').select('*')
  const { data: payouts } = await supabase.from('operator_payouts').select('total')
  if (!revenue?.length) return
  const totalRevenue = revenue.reduce((s: number, r: any) => s + Number(r.revenue), 0)
  const monthlyAverage = totalRevenue / revenue.length
  const best = revenue.reduce((a: any, b: any) => Number(a.revenue) > Number(b.revenue) ? a : b)
  const totalPayouts = payouts?.reduce((s: number, p: any) => s + Number(p.total), 0) ?? 0
  const total2025 = revenue.filter((r: any) => Number(r.year) === 2025).reduce((s: number, r: any) => s + Number(r.revenue), 0)
  const total2026 = revenue.filter((r: any) => Number(r.year) === 2026).reduce((s: number, r: any) => s + Number(r.revenue), 0)
  const yoyGrowth = total2025 > 0 ? ((total2026 - total2025) / total2025) * 100 : 0
  await supabase.from('dashboard_kpis').upsert({
    id: 1,
    total_revenue: totalRevenue,
    best_month: best.month,
    best_month_value: Number(best.revenue),
    monthly_average: monthlyAverage,
    total_payouts: totalPayouts,
    yoy_growth: Math.round(yoyGrowth * 10) / 10,
  })
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

const VALID_TABLES = ['monthly_revenue', 'client_data', 'operator_payouts'] as const
type TableName = typeof VALID_TABLES[number]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authorized = await verifyUser(req.headers['authorization'] as string)
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' })

  const table = req.query.table as string
  if (!VALID_TABLES.includes(table as TableName)) {
    return res.status(400).json({ error: `Invalid table. Use: ${VALID_TABLES.join(', ')}` })
  }

  const contentType = req.headers['content-type'] ?? ''
  let rawRows: Record<string, string>[]

  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    const body = req.body as string
    if (typeof body !== 'string') return res.status(400).json({ error: 'Expected text body' })
    rawRows = parseCSV(body)
  } else if (contentType.includes('application/json')) {
    const body = req.body
    if (!Array.isArray(body)) return res.status(400).json({ error: 'Expected JSON array' })
    rawRows = body
  } else {
    return res.status(415).json({ error: 'Content-Type must be text/csv or application/json' })
  }

  if (!rawRows.length) return res.status(400).json({ error: 'No rows found in file' })

  // Full replace
  await supabase.from(table).delete().neq('id', 0)

  let rows: object[]
  if (table === 'monthly_revenue') {
    rows = rawRows.map((r, i) => ({
      sort_order: Number(r.sort_order ?? i), month: r.month, year: Number(r.year),
      revenue: Number(r.revenue), opco: Number(r.opco),
      sabrina: Number(r.sabrina), giovani: Number(r.giovani), gabriella: Number(r.gabriella),
      is_highlight: r.is_highlight === 'true' || r.is_highlight === '1',
    }))
  } else if (table === 'client_data') {
    rows = rawRows.map(r => ({
      rank: Number(r.rank), name: r.name,
      revenue: Number(r.revenue), percentage: Number(r.percentage),
    }))
  } else {
    rows = rawRows.map((r, i) => ({
      sort_order: Number(r.sort_order ?? i), name: r.name,
      total: Number(r.total), percentage: Number(r.percentage),
    }))
  }

  const { error } = await supabase.from(table).insert(rows)
  if (error) return res.status(400).json({ error: error.message })

  await recalculateKPIs()
  return res.status(200).json({ ok: true, inserted: rows.length })
}
