import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyUser, recalculateKPIs } from '@/lib/supabase/admin'

function getAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Upsert a single monthly_revenue row for the user's org
export async function POST(req: NextRequest) {
  const { valid, orgId, role } = await verifyUser(req.headers.get('authorization'))
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 404 })
  if (!['owner', 'admin'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Apenas owners e admins podem editar' }, { status: 403 })
  }

  const r = await req.json()
  const admin = getAdmin()

  const payload: Record<string, unknown> = {
    sort_order: Number(r.sortOrder) || 0,
    month: r.month,
    year: Number(r.year),
    revenue: Number(r.revenue) || 0,
    opco: Number(r.opco) || 0,
    sabrina: Number(r.sabrina) || 0,
    giovani: Number(r.giovani) || 0,
    gabriella: Number(r.gabriella) || 0,
    is_highlight: !!r.isHighlight,
    organization_id: orgId,
  }
  if (r.id) payload.id = r.id

  const { error } = await (admin as any).from('monthly_revenue').upsert(payload)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await recalculateKPIs(orgId)
  return NextResponse.json({ ok: true })
}

// Delete a row (scoped to the user's org)
export async function DELETE(req: NextRequest) {
  const { valid, orgId, role } = await verifyUser(req.headers.get('authorization'))
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 404 })
  if (!['owner', 'admin'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Apenas owners e admins podem editar' }, { status: 403 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = getAdmin()
  const { error } = await (admin as any).from('monthly_revenue').delete().eq('id', Number(id)).eq('organization_id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await recalculateKPIs(orgId)
  return NextResponse.json({ ok: true })
}
