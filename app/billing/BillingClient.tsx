'use client'

import { useState } from 'react'
import { PLANS, type PlanKey } from '@/lib/stripe/config'
import { createClient } from '@/lib/supabase/client'

async function authHeaders() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token ?? ''}`,
  }
}

interface Org {
  id: string
  name: string
  plan: string
  subscription_status: string
  trial_ends_at: string | null
  current_period_end: string | null
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  trialing:   { text: 'Em teste', color: 'bg-blue-100 text-blue-700' },
  active:     { text: 'Ativo', color: 'bg-emerald-100 text-emerald-700' },
  past_due:   { text: 'Pagamento pendente', color: 'bg-amber-100 text-amber-700' },
  canceled:   { text: 'Cancelado', color: 'bg-red-100 text-red-700' },
  incomplete: { text: 'Incompleto', color: 'bg-slate-100 text-slate-700' },
}

export default function BillingClient({ org }: { org: Org }) {
  const [loading, setLoading] = useState<string | null>(null)

  async function subscribe(plan: PlanKey) {
    setLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ plan, organizationId: org.id }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else throw new Error(data.error)
    } catch (err: any) {
      alert(err.message)
      setLoading(null)
    }
  }

  async function openPortal() {
    setLoading('portal')
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ organizationId: org.id }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else throw new Error(data.error)
    } catch (err: any) {
      alert(err.message)
      setLoading(null)
    }
  }

  const status = STATUS_LABEL[org.subscription_status] ?? STATUS_LABEL.incomplete
  const hasActiveSub = org.subscription_status === 'active' || org.subscription_status === 'past_due'
  const trialDays = org.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Planos e Cobrança</h1>
            <p className="text-sm text-slate-500 mt-1">{org.name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
            {status.text}
          </span>
        </div>

        {/* Current status banner */}
        {org.subscription_status === 'trialing' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
            Período de teste — <strong>{trialDays} dia(s)</strong> restante(s). Assine para continuar após o teste.
          </div>
        )}
        {org.subscription_status === 'past_due' && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            Pagamento pendente. Atualize seu método de pagamento para evitar suspensão.
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.values(PLANS)).map(plan => {
            const isCurrent = org.plan === plan.key && hasActiveSub
            const popular = plan.key === 'pro'
            return (
              <div key={plan.key}
                className={`relative bg-white rounded-2xl border p-6 flex flex-col ${
                  popular ? 'border-orange-500 shadow-lg' : 'border-slate-200 shadow-sm'
                }`}>
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                    Mais Popular
                  </span>
                )}
                <h3 className="font-bold text-slate-900 text-lg">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-black text-slate-900">R$ {plan.priceMonthly}</span>
                  <span className="text-sm text-slate-500">/mês</span>
                </div>
                <ul className="space-y-2 flex-grow mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-emerald-500 mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button onClick={openPortal} disabled={loading !== null}
                    className="w-full py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 disabled:opacity-50">
                    {loading === 'portal' ? 'Abrindo...' : 'Gerenciar Assinatura'}
                  </button>
                ) : (
                  <button onClick={() => subscribe(plan.key)} disabled={loading !== null}
                    className={`w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors ${
                      popular ? 'bg-orange-500 text-white hover:bg-orange-600'
                              : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}>
                    {loading === plan.key ? 'Redirecionando...' : 'Assinar'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {hasActiveSub && (
          <div className="mt-6 text-center">
            <button onClick={openPortal} disabled={loading !== null}
              className="text-sm text-slate-500 hover:text-slate-900 underline">
              Gerenciar pagamento, faturas e cancelamento
            </button>
          </div>
        )}

        <a href="/" className="block text-center mt-8 text-sm text-slate-400 hover:text-slate-700 transition-colors">
          ← Voltar ao Dashboard
        </a>
      </div>
    </div>
  )
}
