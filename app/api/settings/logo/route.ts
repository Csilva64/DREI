import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyUser } from '@/lib/supabase/admin'

function getAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const BUCKET = 'logos'
const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif']
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export async function POST(req: NextRequest) {
  const { valid, orgId, role } = await verifyUser(req.headers.get('authorization'))
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 404 })
  if (!['owner', 'admin'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Apenas owners e admins' }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Formato inválido. Use PNG, JPG, SVG, WEBP ou GIF.' }, { status: 415 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Arquivo muito grande (máx. 2 MB).' }, { status: 413 })
  }

  const admin = getAdmin()

  // Ensure bucket exists (idempotent)
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const path = `${orgId}/logo-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)
  const logoUrl = pub.publicUrl

  // Save to branding
  await (admin as any).from('organization_branding')
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq('organization_id', orgId)

  return NextResponse.json({ ok: true, logoUrl })
}
