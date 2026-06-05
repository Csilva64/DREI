import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function assertPlatformAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.is_platform_admin !== true) {
    throw new Error('Forbidden')
  }
}

export async function GET() {
  try {
    await assertPlatformAdmin()
    const admin = getAdmin()
    const { data, error } = await admin
      .from('organizations')
      .select('*, organization_branding(*), organization_members(count)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === 'Forbidden' ? 403 : 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await assertPlatformAdmin()
    const { name, slug, plan, primaryColor, adminEmail } = await req.json()

    if (!name || !slug) return NextResponse.json({ error: 'name and slug required' }, { status: 400 })

    const admin = getAdmin()

    // Create org
    const { data: org, error: orgErr } = await admin
      .from('organizations')
      .insert({ name, slug, plan: plan ?? 'starter' })
      .select()
      .single()
    if (orgErr) throw new Error(orgErr.message)

    // Create branding
    await admin.from('organization_branding').insert({
      organization_id: org.id,
      company_name: name,
      primary_color: primaryColor ?? '#f97316',
    })

    // Enroll admin user if email provided
    if (adminEmail) {
      const { data: users } = await admin.auth.admin.listUsers()
      const adminUser = (users?.users as any[])?.find((u: any) => u.email === adminEmail)
      if (adminUser) {
        await admin.from('organization_members').insert({
          organization_id: org.id,
          user_id: adminUser.id,
          role: 'owner',
        })
      }
    }

    return NextResponse.json({ ok: true, org })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === 'Forbidden' ? 403 : 500 })
  }
}
