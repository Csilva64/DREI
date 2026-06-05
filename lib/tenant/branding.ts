import { createClient } from '@supabase/supabase-js'
import type { OrganizationBranding } from '@/types'
import { DEFAULT_BRANDING } from '@/lib/tenant'

let _admin: ReturnType<typeof createClient> | null = null

function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _admin
}

export async function fetchBrandingBySlug(slug: string): Promise<OrganizationBranding> {
  try {
    const { data, error } = await getAdmin()
      .from('organizations')
      .select(`
        id,
        slug,
        organization_branding (
          company_name, logo_url, favicon_url,
          primary_color, accent_color, locale, currency, custom_domain
        )
      `)
      .eq('slug', slug)
      .single()

    if (error || !data) return DEFAULT_BRANDING

    const d = data as any
    const b = d.organization_branding
    if (!b) return { ...DEFAULT_BRANDING, organizationId: d.id }

    return {
      organizationId: d.id,
      companyName: b.company_name,
      logoUrl: b.logo_url,
      faviconUrl: b.favicon_url,
      primaryColor: b.primary_color ?? '#f97316',
      accentColor: b.accent_color ?? '#3b82f6',
      locale: b.locale ?? 'pt-BR',
      currency: b.currency ?? 'BRL',
      customDomain: b.custom_domain,
    }
  } catch {
    return DEFAULT_BRANDING
  }
}
