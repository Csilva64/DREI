'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type AuthContextType = {
  session: Session | null
  user: User | null
  loading: boolean
  organizationId: string | null
  organizationRole: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  organizationId: null,
  organizationRole: null,
  signOut: async () => {},
})

function parseOrgFromJWT(session: Session | null) {
  if (!session?.access_token) return { organizationId: null, organizationRole: null }
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1]))
    return {
      organizationId: payload.organization_id ?? null,
      organizationRole: payload.organization_role ?? null,
    }
  } catch {
    return { organizationId: null, organizationRole: null }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [orgInfo, setOrgInfo] = useState<{ organizationId: string | null; organizationRole: string | null }>({
    organizationId: null,
    organizationRole: null,
  })

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setOrgInfo(parseOrgFromJWT(session))
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setOrgInfo(parseOrgFromJWT(session))
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      organizationId: orgInfo.organizationId,
      organizationRole: orgInfo.organizationRole,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
