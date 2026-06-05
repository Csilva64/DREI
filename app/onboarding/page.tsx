'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'account' | 'company' | 'branding' | 'done'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orgId, setOrgId] = useState('')

  const [account, setAccount] = useState({ email: '', password: '' })
  const [company, setCompany] = useState({ name: '', slug: '' })
  const [brand, setBrand] = useState({ primaryColor: '#f97316', accentColor: '#3b82f6' })

  async function handleAccount(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({ email: account.email, password: account.password })
      if (error) throw error
      setStep('company')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCompany(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding/create-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...company, email: account.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrgId(data.orgId)
      setStep('branding')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleBranding(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/onboarding/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, ...brand }),
      })
      setStep('done')
    } catch {}
    setLoading(false)
  }

  const inp = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-orange-500'
  const lbl = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1'
  const stepN = { account: 1, company: 2, branding: 3, done: 4 }[step]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1,2,3,4].map(n => (
            <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= stepN ? 'bg-orange-500' : 'bg-slate-700'}`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {step === 'account' && (
            <form onSubmit={handleAccount} className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Criar Conta</h1>
                <p className="text-sm text-slate-500 mt-1">Comece configurando seu acesso</p>
              </div>
              <div>
                <label className={lbl}>E-mail</label>
                <input className={inp} type="email" value={account.email}
                  onChange={e => setAccount(a => ({ ...a, email: e.target.value }))} required />
              </div>
              <div>
                <label className={lbl}>Senha</label>
                <input className={inp} type="password" value={account.password}
                  onChange={e => setAccount(a => ({ ...a, password: e.target.value }))}
                  minLength={6} required />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 disabled:opacity-50">
                {loading ? 'Criando...' : 'Continuar →'}
              </button>
              <p className="text-center text-xs text-slate-400">
                Já tem conta? <a href="/" className="text-orange-500 hover:underline">Entrar</a>
              </p>
            </form>
          )}

          {step === 'company' && (
            <form onSubmit={handleCompany} className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Sua Empresa</h1>
                <p className="text-sm text-slate-500 mt-1">Configure os dados da organização</p>
              </div>
              <div>
                <label className={lbl}>Nome da Empresa</label>
                <input className={inp} value={company.name}
                  onChange={e => {
                    const name = e.target.value
                    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
                    setCompany({ name, slug })
                  }} required />
              </div>
              <div>
                <label className={lbl}>Slug (URL)</label>
                <input className={inp} value={company.slug}
                  onChange={e => setCompany(c => ({ ...c, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  required />
                <p className="text-xs text-slate-400 mt-1">{company.slug || 'minha-empresa'}.dashboard.com</p>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 disabled:opacity-50">
                {loading ? 'Criando...' : 'Continuar →'}
              </button>
            </form>
          )}

          {step === 'branding' && (
            <form onSubmit={handleBranding} className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Identidade Visual</h1>
                <p className="text-sm text-slate-500 mt-1">Personalize as cores do seu dashboard</p>
              </div>
              <div>
                <label className={lbl}>Cor Principal</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={brand.primaryColor}
                    onChange={e => setBrand(b => ({ ...b, primaryColor: e.target.value }))}
                    className="w-12 h-12 rounded-lg border border-slate-200 cursor-pointer" />
                  <div className="flex-1 h-12 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
                    style={{ backgroundColor: brand.primaryColor }}>
                    Preview
                  </div>
                </div>
              </div>
              <div>
                <label className={lbl}>Cor de Destaque</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={brand.accentColor}
                    onChange={e => setBrand(b => ({ ...b, accentColor: e.target.value }))}
                    className="w-12 h-12 rounded-lg border border-slate-200 cursor-pointer" />
                  <div className="flex-1 h-12 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
                    style={{ backgroundColor: brand.accentColor }}>
                    Gráficos
                  </div>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 disabled:opacity-50">
                {loading ? 'Salvando...' : 'Finalizar →'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center space-y-4">
              <div className="text-5xl">🎉</div>
              <h1 className="text-2xl font-bold text-slate-900">Pronto!</h1>
              <p className="text-slate-500 text-sm">
                Sua organização <strong>{company.name}</strong> foi criada.
                Acesse em <strong>{company.slug}.dashboard.com</strong>
              </p>
              <button onClick={() => router.push('/')}
                className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600">
                Ir para o Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
