'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function ObrigadoContent() {
  const params = useSearchParams()
  const sessionId = params.get('session_id') ?? ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'activating' | 'error'>('loading')
  const [msg, setMsg] = useState('')

  // On mount: sign out any stale session + fetch email for this paid checkout
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient()
        await supabase.auth.signOut() // clear any previous session (e.g. OPCO owner)

        if (!sessionId) { setStatus('error'); setMsg('Sessão de pagamento não encontrada.'); return }

        const res = await fetch(`/api/onboarding/activate?session_id=${encodeURIComponent(sessionId)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setEmail(data.email)
        setStatus('ready')
      } catch (err: any) {
        setStatus('error')
        setMsg(err.message ?? 'Erro ao carregar')
      }
    })()
  }, [sessionId])

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setMsg('Senha mínima de 6 caracteres'); return }
    setStatus('activating')
    setMsg('')
    try {
      const res = await fetch('/api/onboarding/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Log in with the freshly set password
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email: data.email, password })
      if (error) throw error

      window.location.href = '/settings'
    } catch (err: any) {
      setStatus('ready')
      setMsg(err.message ?? 'Erro ao ativar conta')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full space-y-5">
        <div className="text-center space-y-2">
          <div className="text-4xl">🎉</div>
          <h1 className="text-2xl font-bold text-slate-900">Pagamento confirmado!</h1>
          <p className="text-sm text-slate-500">Crie sua senha para acessar o dashboard.</p>
        </div>

        {status === 'loading' && (
          <div className="py-6 text-center">
            <span className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin inline-block" />
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-red-500">{msg}</p>
            <a href="/" className="block w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600">
              Ir para o login
            </a>
          </div>
        )}

        {(status === 'ready' || status === 'activating') && (
          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">E-mail</label>
              <input value={email} disabled
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Crie uma senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" minLength={6} required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-orange-500" />
            </div>
            {msg && <p className="text-sm text-red-500">{msg}</p>}
            <button type="submit" disabled={status === 'activating'}
              className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 disabled:opacity-50">
              {status === 'activating' ? 'Ativando...' : 'Acessar Dashboard →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ObrigadoPage() {
  return (
    <Suspense fallback={null}>
      <ObrigadoContent />
    </Suspense>
  )
}
