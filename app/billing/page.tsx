'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BillingClient from './BillingClient'

interface Org {
  id: string
  name: string
  plan: string
  subscription_status: string
  trial_ends_at: string | null
  current_period_end: string | null
}

export default function BillingPage() {
  const [org, setOrg] = useState<Org | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }

      const res = await fetch('/api/billing/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setOrg(data.org)
    })()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-red-500 text-sm">
        {error}
      </div>
    )
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  return <BillingClient org={org} />
}
