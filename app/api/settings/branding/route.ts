import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = (await supabase.auth.getSession()).data.session?.access_token ?? ''
  let orgId: string | null = null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const role = payload.organization_role
    orgId = payload.organization_id
    if (!orgId || !['owner', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  const { companyName, primaryColor, accentColor, logoUrl, customDomain } = await req.json()

  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await admin.from('organization_branding').update({
    company_name: companyName,
    primary_color: primaryColor,
    accent_color: accentColor,
    logo_url: logoUrl || null,
    custom_domain: customDomain || null,
    updated_at: new Date().toISOString(),
  }).eq('organization_id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
