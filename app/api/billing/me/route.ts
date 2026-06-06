import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyUser } from '@/lib/supabase/admin'
import { OPCO_ORG_ID } from '@/lib/tenant'

function getAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const { valid, orgId } = await verifyUser(req.headers.get('authorization'))
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getAdmin()
  const targetOrg = orgId ?? OPCO_ORG_ID

  const { data: org } = await (admin as any)
    .from('organizations')
    .select('id, name, plan, subscription_status, trial_ends_at, current_period_end')
    .eq('id', targetOrg)
    .single()

  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  return NextResponse.json({ org })
}
