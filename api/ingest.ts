import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase, authenticate, recalculateKPIs } from './_supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!authenticate(req.headers['x-api-key'])) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const body = req.body
  const errors: string[] = []
  const replace = body.replace === true

  if (body.monthly_revenue) {
    const rows = (body.monthly_revenue as any[]).map((r, i) => ({
      sort_order: r.sort_order ?? i,
      month: r.month,
      year: Number(r.year),
      revenue: Number(r.revenue),
      opco: Number(r.opco),
      sabrina: Number(r.sabrina),
      giovani: Number(r.giovani),
      gabriella: Number(r.gabriella),
      is_highlight: r.is_highlight ?? false,
    }))

    if (replace) {
      await supabase.from('monthly_revenue').delete().neq('id', 0)
    }

    const { error } = await supabase.from('monthly_revenue').upsert(rows)
    if (error) errors.push(`monthly_revenue: ${error.message}`)
  }

  if (body.client_data) {
    const rows = (body.client_data as any[]).map(r => ({
      rank: Number(r.rank),
      name: r.name,
      revenue: Number(r.revenue),
      percentage: Number(r.percentage),
    }))

    if (replace) {
      await supabase.from('client_data').delete().neq('id', 0)
    }

    const { error } = await supabase.from('client_data').upsert(rows)
    if (error) errors.push(`client_data: ${error.message}`)
  }

  if (body.operator_payouts) {
    const rows = (body.operator_payouts as any[]).map((r, i) => ({
      sort_order: r.sort_order ?? i,
      name: r.name,
      total: Number(r.total),
      percentage: Number(r.percentage),
    }))

    if (replace) {
      await supabase.from('operator_payouts').delete().neq('id', 0)
    }

    const { error } = await supabase.from('operator_payouts').upsert(rows)
    if (error) errors.push(`operator_payouts: ${error.message}`)
  }

  if (errors.length) {
    return res.status(400).json({ errors })
  }

  await recalculateKPIs()
  return res.status(200).json({ ok: true, message: 'Data ingested and KPIs recalculated' })
}
