import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyUser } from '@/lib/supabase/admin'

function getAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const { valid, orgId, role } = await verifyUser(req.headers.get('authorization'))
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 404 })

  const admin = getAdmin()
  const { data: org } = await (admin as any)
    .from('organizations')
    .select('id, name, plan, subscription_status, trial_ends_at, current_period_end')
    .eq('id', orgId)
    .single()

  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  // Branding so the dashboard can show the right company data scope
  const { data: branding } = await (admin as any)
    .from('organization_branding')
    .select('company_name, logo_url, primary_color, accent_color')
    .eq('organization_id', orgId)
    .single()

  return NextResponse.json({ org, role, branding })
}
