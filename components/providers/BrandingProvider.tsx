'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { OrganizationBranding } from '@/types'
import { DEFAULT_BRANDING } from '@/lib/tenant'

const BrandingContext = createContext<OrganizationBranding>(DEFAULT_BRANDING)

export function BrandingProvider({
  branding,
  children,
}: {
  branding: OrganizationBranding
  children: ReactNode
}) {
  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  )
}

export const useBranding = () => useContext(BrandingContext)
