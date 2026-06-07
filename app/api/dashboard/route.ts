import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyUser } from '@/lib/supabase/admin'

function getAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const { valid, orgId } = await verifyUser(req.headers.get('authorization'))
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 404 })

  const admin = getAdmin()

  const [kpiRes, revRes, cliRes, opRes] = await Promise.all([
    (admin as any).from('dashboard_kpis').select('*').eq('organization_id', orgId).order('id', { ascending: false }).limit(1).maybeSingle(),
    (admin as any).from('monthly_revenue').select('*').eq('organization_id', orgId).order('sort_order'),
    (admin as any).from('client_data').select('*').eq('organization_id', orgId).order('rank'),
    (admin as any).from('operator_payouts').select('*').eq('organization_id', orgId).order('sort_order'),
  ])

  const k = kpiRes.data
  const kpis = k ? {
    totalRevenue: Number(k.total_revenue),
    bestMonth: { month: k.best_month, value: Number(k.best_month_value) },
    monthlyAverage: Number(k.monthly_average),
    totalPayouts: Number(k.total_payouts),
    yoyGrowth: Number(k.yoy_growth),
  } : {
    totalRevenue: 0,
    bestMonth: { month: '—', value: 0 },
    monthlyAverage: 0,
    totalPayouts: 0,
    yoyGrowth: 0,
  }

  const PT_MONTHS: Record<string, number> = {
    jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
    jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
  }
  function chronoKey(month: string, year: number): number {
    const abbr = String(month).slice(0, 3).toLowerCase()
    const mi = PT_MONTHS[abbr] ?? 0
    let y = Number(year) || 0
    if (!y) { // derive from "Mmm/AA"
      const yy = String(month).split('/')[1]
      if (yy) y = 2000 + Number(yy)
    }
    return y * 12 + mi
  }

  const revenueData = (revRes.data ?? []).map((row: any) => ({
    id: row.id, month: row.month, year: row.year,
    revenue: Number(row.revenue), opco: Number(row.opco),
    sabrina: Number(row.sabrina), giovani: Number(row.giovani), gabriella: Number(row.gabriella),
    isHighlight: row.is_highlight,
  })).sort((a: any, b: any) => chronoKey(a.month, a.year) - chronoKey(b.month, b.year))

  const clientData = (cliRes.data ?? []).map((row: any) => ({
    rank: row.rank, name: row.name, revenue: Number(row.revenue), percentage: Number(row.percentage),
  }))

  const operatorData = (opRes.data ?? []).map((row: any) => ({
    name: row.name, total: Number(row.total), percentage: Number(row.percentage),
  }))

  return NextResponse.json({ kpis, revenueData, clientData, operatorData })
}
