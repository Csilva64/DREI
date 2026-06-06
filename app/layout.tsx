import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { BrandingProvider } from '@/components/providers/BrandingProvider'
import { SubscriptionProvider } from '@/components/providers/SubscriptionProvider'
import { fetchBrandingBySlug } from '@/lib/tenant/branding'
import { DEFAULT_BRANDING } from '@/lib/tenant'

export const metadata: Metadata = {
  title: 'DRE-I Painel',
  description: 'DRE-I Painel',
  openGraph: {
    title: 'DRE-I Painel',
    description: 'DRE-I Painel',
    type: 'website',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read tenant slug set by middleware
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug') ?? 'opco'

  const branding = await fetchBrandingBySlug(tenantSlug)

  return (
    <html lang={branding.locale}>
      <head>
        {branding.faviconUrl && <link rel="icon" href={branding.faviconUrl} />}
        <title>{branding.companyName} · DRE-I</title>
        <style>{`
          :root {
            --color-primary: ${branding.primaryColor};
            --color-accent: ${branding.accentColor};
          }
        `}</style>
      </head>
      <body>
        <BrandingProvider branding={branding}>
          <AuthProvider>
            <SubscriptionProvider>
              {children}
            </SubscriptionProvider>
          </AuthProvider>
        </BrandingProvider>
      </body>
    </html>
  )
}
