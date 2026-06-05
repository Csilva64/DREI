import { createClient } from './supabase/client'
import type { MonthlyRevenue, ClientData, OperatorPayout, DashboardKPIs } from '../types'

export async function fetchKPIs(): Promise<DashboardKPIs> {
  const supabase = createClient()
  const { data, error } = await supabase.from('dashboard_kpis').select('*').order('id').limit(1).maybeSingle()
  if (error) throw error
  if (!data) return {
    totalRevenue: 0,
    bestMonth: { month: '—', value: 0 },
    monthlyAverage: 0,
    totalPayouts: 0,
    yoyGrowth: 0,
  }
  return {
    totalRevenue: data.total_revenue,
    bestMonth: { month: data.best_month, value: data.best_month_value },
    monthlyAverage: data.monthly_average,
    totalPayouts: data.total_payouts,
    yoyGrowth: data.yoy_growth,
  }
}

export async function fetchRevenueData(): Promise<MonthlyRevenue[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('monthly_revenue').select('*').order('sort_order')
  if (error) throw error
  return data.map(row => ({
    id: row.id,
    month: row.month,
    year: row.year,
    revenue: Number(row.revenue),
    opco: Number(row.opco),
    sabrina: Number(row.sabrina),
    giovani: Number(row.giovani),
    gabriella: Number(row.gabriella),
    isHighlight: row.is_highlight,
  }))
}

export async function fetchClientData(): Promise<ClientData[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('client_data').select('*').order('rank')
  if (error) throw error
  return data.map(row => ({
    rank: row.rank,
    name: row.name,
    revenue: Number(row.revenue),
    percentage: Number(row.percentage),
  }))
}

export async function fetchOperatorData(): Promise<OperatorPayout[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('operator_payouts').select('*').order('sort_order')
  if (error) throw error
  return data.map(row => ({
    name: row.name,
    total: Number(row.total),
    percentage: Number(row.percentage),
  }))
}
