'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getFeatures, isSubscriptionActive, type PlanFeatures } from '@/lib/stripe/config'

interface SubscriptionInfo {
  loading: boolean
  plan: string
  status: string
  trialEndsAt: string | null
  active: boolean
  features: PlanFeatures
  organizationId: string | null
}

const defaultFeatures = getFeatures('starter')

const SubscriptionContext = createContext<SubscriptionInfo>({
  loading: true,
  plan: 'starter',
  status: 'trialing',
  trialEndsAt: null,
  active: true,
  features: defaultFeatures,
  organizationId: null,
})

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<SubscriptionInfo>({
    loading: true,
    plan: 'starter',
    status: 'trialing',
    trialEndsAt: null,
    active: true,
    features: defaultFeatures,
    organizationId: null,
  })

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

        const { org } = await res.json()
        setInfo({
          loading: false,
          plan: org.plan,
          status: org.subscription_status,
          trialEndsAt: org.trial_ends_at,
          active: isSubscriptionActive(org.subscription_status, org.trial_ends_at),
          features: getFeatures(org.plan),
          organizationId: org.id,
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
