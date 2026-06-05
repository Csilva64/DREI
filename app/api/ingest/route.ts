import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, recalculateKPIs } from '@/lib/supabase/admin'
import { OPCO_ORG_ID } from '@/lib/tenant'

function authenticate(apiKey: string | null): boolean {
  if (!process.env.INGEST_API_KEY) return false
  return apiKey === process.env.INGEST_API_KEY
}

export async function POST(request: NextRequest) {
  if (!authenticate(request.headers.get('x-api-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const errors: string[] = []
  const replace = body.replace === true
  const organizationId = body.organization_id ?? OPCO_ORG_ID

  if (body.monthly_revenue) {
    const rows = (body.monthly_revenue as any[]).map((r, i) => ({
      sort_order: r.sort_order ?? i, month: r.month, year: Number(r.year),
      revenue: Number(r.revenue), opco: Number(r.opco),
      sabrina: Number(r.sabrina), giovani: Number(r.giovani), gabriella: Number(r.gabriella),
      is_highlight: r.is_highlight ?? false,
      organization_id: organizationId,
    }))
    if (replace) await (supabaseAdmin as any).from('monthly_revenue').delete().eq('organization_id', organizationId)
    const { error } = await (supabaseAdmin as any).from('monthly_revenue').upsert(rows)
    if (error) errors.push(`monthly_revenue: ${error.message}`)
  }

  if (body.client_data) {
    const rows = (body.client_data as any[]).map(r => ({
      rank: Number(r.rank), name: r.name, revenue: Number(r.revenue), percentage: Number(r.percentage),
      organization_id: organizationId,
    }))
    if (replace) await (supabaseAdmin as any).from('client_data').delete().eq('organization_id', organizationId)
    const { error } = await (supabaseAdmin as any).from('client_data').upsert(rows)
    if (error) errors.push(`client_data: ${error.message}`)
  }

  if (body.operator_payouts) {
    const rows = (body.operator_payouts as any[]).map((r, i) => ({
      sort_order: r.sort_order ?? i, name: r.name,
      total: Number(r.total), percentage: Number(r.percentage),
      organization_id: organizationId,
    }))
    if (replace) await (supabaseAdmin as any).from('operator_payouts').delete().eq('organization_id', organizationId)
    const { error } = await (supabaseAdmin as any).from('operator_payouts').upsert(rows)
    if (error) errors.push(`operator_payouts: ${error.message}`)
  }

  if (errors.length) return NextResponse.json({ errors }, { status: 400 })

  await recalculateKPIs(organizationId)
  return NextResponse.json({ ok: true, message: 'Data ingested and KPIs recalculated' })
}
