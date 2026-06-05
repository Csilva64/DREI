import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { name, slug, email } = await req.json()
  if (!name || !slug) return NextResponse.json({ error: 'name and slug required' }, { status: 400 })

  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Check slug uniqueness
  const { data: existing } = await admin.from('organizations').select('id').eq('slug', slug).single()
  if (existing) return NextResponse.json({ error: 'Slug já em uso. Escolha outro.' }, { status: 409 })

  // Create org
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({ name, slug, plan: 'starter' })
    .select()
    .single()
  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 })

  // Create branding
  await admin.from('organization_branding').insert({
    organization_id: org.id,
    company_name: name,
  })

  // Enroll user if authenticated
  if (email) {
    const { data: users } = await admin.auth.admin.listUsers()
    const user = (users?.users as any[])?.find((u: any) => u.email === email)
    if (user) {
      await admin.from('organization_members').insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'owner',
      })
    }
  }

  return NextResponse.json({ ok: true, orgId: org.id })
}
