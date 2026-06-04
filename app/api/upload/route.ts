import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, recalculateKPIs, parseCSV } from '@/lib/supabase/admin'

function authenticate(apiKey: string | null): boolean {
  if (!process.env.INGEST_API_KEY) return false
  return apiKey === process.env.INGEST_API_KEY
}

const VALID_TABLES = ['monthly_revenue', 'client_data', 'operator_payouts'] as const
type TableName = typeof VALID_TABLES[number]

export async function POST(request: NextRequest) {
  if (!authenticate(request.headers.get('x-api-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const table = request.nextUrl.searchParams.get('table') ?? ''
  if (!VALID_TABLES.includes(table as TableName)) {
    return NextResponse.json({ error: `Invalid table. Use: ${VALID_TABLES.join(', ')}` }, { status: 400 })
  }

  const contentType = request.headers.get('content-type') ?? ''
  let rawRows: Record<string, string>[]

  if (contentType.includes('text/csv')) {
    rawRows = parseCSV(await request.text())
  } else if (contentType.includes('application/json')) {
    const body = await request.json()
    if (!Array.isArray(body)) return NextResponse.json({ error: 'Expected JSON array' }, { status: 400 })
    rawRows = body
  } else {
    return NextResponse.json({ error: 'Content-Type must be text/csv or application/json' }, { status: 415 })
  }

  if (!rawRows.length) return NextResponse.json({ error: 'No rows found' }, { status: 400 })

  await ( supabaseAdmin as any).from(table).delete().neq('id', 0)

  let rows: any[]
  if (table === 'monthly_revenue') {
    rows = rawRows.map((r, i) => ({
      sort_order: Number(r.sort_order ?? i), month: r.month, year: Number(r.year),
      revenue: Number(r.revenue), opco: Number(r.opco),
      sabrina: Number(r.sabrina), giovani: Number(r.giovani), gabriella: Number(r.gabriella),
      is_highlight: r.is_highlight === 'true' || r.is_highlight === '1',
    }))
  } else if (table === 'client_data') {
    rows = rawRows.map(r => ({ rank: Number(r.rank), name: r.name, revenue: Number(r.revenue), percentage: Number(r.percentage) }))
  } else {
    rows = rawRows.map((r, i) => ({ sort_order: Number(r.sort_order ?? i), name: r.name, total: Number(r.total), percentage: Number(r.percentage) }))
  }

  const { error } = await ( supabaseAdmin as any).from(table).insert(rows as any[])
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await recalculateKPIs()
  return NextResponse.json({ ok: true, inserted: rows.length, message: `${table} updated and KPIs recalculated` })
}
