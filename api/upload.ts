import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase, authenticate, recalculateKPIs, parseCSV } from './_supabase'

const VALID_TABLES = ['monthly_revenue', 'client_data', 'operator_payouts'] as const
type TableName = typeof VALID_TABLES[number]

function toMonthlyRevenue(rows: Record<string, string>[]) {
  return rows.map((r, i) => ({
    sort_order: Number(r.sort_order ?? i),
    month: r.month,
    year: Number(r.year),
    revenue: Number(r.revenue),
    opco: Number(r.opco),
    sabrina: Number(r.sabrina),
    giovani: Number(r.giovani),
    gabriella: Number(r.gabriella),
    is_highlight: r.is_highlight === 'true' || r.is_highlight === '1',
  }))
}

function toClientData(rows: Record<string, string>[]) {
  return rows.map(r => ({
    rank: Number(r.rank),
    name: r.name,
    revenue: Number(r.revenue),
    percentage: Number(r.percentage),
  }))
}

function toOperatorPayouts(rows: Record<string, string>[]) {
  return rows.map((r, i) => ({
    sort_order: Number(r.sort_order ?? i),
    name: r.name,
    total: Number(r.total),
    percentage: Number(r.percentage),
  }))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!authenticate(req.headers['x-api-key'])) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const table = req.query.table as string
  if (!VALID_TABLES.includes(table as TableName)) {
    return res.status(400).json({
      error: `Invalid table. Use: ${VALID_TABLES.join(', ')}`,
    })
  }

  const contentType = req.headers['content-type'] ?? ''
  let rawRows: Record<string, string>[]

  if (contentType.includes('text/csv')) {
    const body = req.body as string
    if (typeof body !== 'string') {
      return res.status(400).json({ error: 'Expected raw CSV text body' })
    }
    rawRows = parseCSV(body)
  } else if (contentType.includes('application/json')) {
    const body = req.body
    if (!Array.isArray(body)) {
      return res.status(400).json({ error: 'Expected JSON array' })
    }
    rawRows = body
  } else {
    return res.status(415).json({ error: 'Content-Type must be text/csv or application/json' })
  }

  if (!rawRows.length) {
    return res.status(400).json({ error: 'No rows found in payload' })
  }

  // Full replace: delete all existing rows then insert
  await supabase.from(table).delete().neq('id', 0)

  let rows: object[]
  if (table === 'monthly_revenue') rows = toMonthlyRevenue(rawRows)
  else if (table === 'client_data') rows = toClientData(rawRows)
  else rows = toOperatorPayouts(rawRows)

  const { error } = await supabase.from(table).insert(rows)
  if (error) {
    return res.status(400).json({ error: error.message })
  }

  await recalculateKPIs()
  return res.status(200).json({
    ok: true,
    inserted: rows.length,
    message: `${table} updated and KPIs recalculated`,
  })
}
