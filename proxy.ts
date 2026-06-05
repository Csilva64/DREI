import { NextRequest, NextResponse } from 'next/server'
import { getTenantSlugFromHost, ROOT_DOMAIN } from '@/lib/tenant'

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const res = NextResponse.next({ request })

  // Skip for API, static assets
  const pathname = request.nextUrl.pathname
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/admin') ||
    pathname.match(/\.(ico|png|jpg|svg|webp)$/)
  ) {
    return res
  }

  // Resolve tenant slug
  let tenantSlug = getTenantSlugFromHost(host)

  // Custom domain fallback: query DB (only in production for unknown hosts)
  if (!tenantSlug && process.env.NODE_ENV === 'production') {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const admin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data } = await admin
        .from('organization_branding')
        .select('organization_id, organizations(slug)')
        .eq('custom_domain', host.split(':')[0])
        .single()

      if (data) {
        tenantSlug = (data.organizations as any)?.slug ?? null
      }
    } catch {}
  }

  // Fallback to OPCO
  if (!tenantSlug) tenantSlug = 'opco'

  res.headers.set('x-tenant-slug', tenantSlug)
  res.headers.set('x-forwarded-host', host)

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
