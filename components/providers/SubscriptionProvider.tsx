'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getFeatures, isSubscriptionActive, type PlanFeatures } from '@/lib/stripe/config'

interface Branding {
  companyName: string
  logoUrl: string | null
  primaryColor: string
  accentColor: string
}

interface SubscriptionInfo {
  loading: boolean
  plan: string
  status: string
  trialEndsAt: string | null
  active: boolean
  features: PlanFeatures
  organizationId: string | null
  role: string | null
  branding: Branding | null
}

const defaultFeatures = getFeatures('starter')

const initial: SubscriptionInfo = {
  loading: true,
  plan: 'starter',
  status: 'trialing',
  trialEndsAt: null,
  active: true,
  features: defaultFeatures,
  organizationId: null,
  role: null,
  branding: null,
}

const SubscriptionContext = createContext<SubscriptionInfo>(initial)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<SubscriptionInfo>(initial)

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setInfo(i => ({ ...i, loading: false })); return }

        const res = await fetch('/api/billing/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) { setInfo(i => ({ ...i, loading: false })); return }

        const { org, role, branding } = await res.json()
        const b: Branding | null = branding ? {
          companyName: branding.company_name,
          logoUrl: branding.logo_url ?? null,
          primaryColor: branding.primary_color ?? '#f97316',
          accentColor: branding.accent_color ?? '#3b82f6',
        } : null

        // Apply branding CSS vars live (per logged-in org, overrides host-based)
        if (b) {
          document.documentElement.style.setProperty('--color-primary', b.primaryColor)
          document.documentElement.style.setProperty('--color-accent', b.accentColor)
        }

        setInfo({
          loading: false,
          plan: org.plan,
          status: org.subscription_status,
          trialEndsAt: org.trial_ends_at,
          active: isSubscriptionActive(org.subscription_status, org.trial_ends_at),
          features: getFeatures(org.plan),
          organizationId: org.id,
          role: role ?? null,
          branding: b,
        })
      } catch {
        setInfo(i => ({ ...i, loading: false }))
      }
    })()
  }, [])

  return (
    <SubscriptionContext.Provider value={info}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext)
