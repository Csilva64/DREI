import type { OrganizationBranding } from '@/types'

export const OPCO_ORG_ID = '6f8b4c2a-1d3e-4f5a-9b7c-8d0e2f1a3b5c'
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'opco-dashboard.vercel.app'

export const DEFAULT_BRANDING: OrganizationBranding = {
  organizationId: OPCO_ORG_ID,
  companyName: 'OPCO Tours',
  primaryColor: '#f97316',
  accentColor: '#3b82f6',
  locale: 'pt-BR',
  currency: 'BRL',
}

/**
 * Resolve tenant slug from hostname.
 * - opco.yourdomain.com → 'opco'
 * - yourdomain.com or localhost → 'opco' (default)
 * - custom-domain.com → resolved via DB
 */
export function getTenantSlugFromHost(host: string): string | null {
  const clean = host.split(':')[0] // strip port

  // localhost or root domain → default tenant
  if (clean === 'localhost' || clean === ROOT_DOMAIN || clean === `www.${ROOT_DOMAIN}`) {
    return 'opco'
  }

  // Subdomain pattern
  if (clean.endsWith(`.${ROOT_DOMAIN}`)) {
    return clean.split('.')[0]
  }

  // Custom domain — caller must resolve via DB
  return null
}
