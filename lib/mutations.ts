import { createClient } from './supabase/client'
import type { MonthlyRevenue } from '../types'

export async function upsertRevenueRow(
  row: MonthlyRevenue & { sortOrder: number },
  organizationId: string
) {
  const supabase = createClient()
  const payload: Record<string, unknown> = {
    sort_order: row.sortOrder,
    month: row.month,
    year: row.year,
    revenue: row.revenue,
    opco: row.opco,
    sabrina: row.sabrina,
    giovani: row.giovani,
    gabriella: row.gabriella,
    is_highlight: row.isHighlight ?? false,
    organization_id: organizationId,
  }
  if (row.id) payload.id = row.id
  const { error } = await supabase.from('monthly_revenue').upsert(payload)
  if (error) throw error
}

export async function deleteRevenueRow(id: number) {
  const supabase = createClient()
  const { error } = await supabase.from('monthly_revenue').delete().eq('id', id)
  if (error) throw error
}
