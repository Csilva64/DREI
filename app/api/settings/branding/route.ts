import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyUser } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest) {
  const { valid, orgId, role } = await verifyUser(req.headers.get('authorization'))
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 404 })
  if (!['owner', 'admin'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Apenas owners e admins podem editar' }, { status: 403 })
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
