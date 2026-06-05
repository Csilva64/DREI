import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { orgId, primaryColor, accentColor } = await req.json()
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await admin.from('organization_branding').update({
    primary_color: primaryColor ?? '#f97316',
    accent_color: accentColor ?? '#3b82f6',
    updated_at: new Date().toISOString(),
  }).eq('organization_id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
