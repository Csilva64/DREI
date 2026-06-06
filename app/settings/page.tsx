'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useBranding } from '@/components/providers/BrandingProvider'
import { useSubscription } from '@/components/providers/SubscriptionProvider'

export default function SettingsPage() {
  useAuth() // auth context loaded for session
  const branding = useBranding()
  const subscription = useSubscription()
  const canCustomDomain = subscription.features.customDomain
  const [form, setForm] = useState({
    companyName: branding.companyName,
    primaryColor: branding.primaryColor,
    accentColor: branding.accentColor,
    logoUrl: branding.logoUrl ?? '',
    customDomain: branding.customDomain ?? '',
  })
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const canEdit = true // JWT hook not stable yet; single-tenant, all authenticated users can edit

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    try {
      const res = await fetch('/api/settings/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatus('saved')
      setMsg('Configurações salvas. Recarregue para ver as mudanças.')
    } catch (err: any) {
      setStatus('error')
      setMsg(err.message)
    }
  }

  const inp = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-50'
  const lbl = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1'

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Configurações</h1>
        <p className="text-sm text-slate-500 mb-8">White-label da sua organização</p>

        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div>
            <label className={lbl}>Nome da Empresa</label>
            <input className={inp} value={form.companyName}
              onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
              disabled={!canEdit} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Cor Principal</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primaryColor}
                  onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                  disabled={!canEdit}
                  className="w-10 h-10 rounded cursor-pointer border border-slate-200 disabled:opacity-50" />
                <input className={`${inp} flex-1`} value={form.primaryColor}
                  onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                  disabled={!canEdit} />
              </div>
            </div>
            <div>
              <label className={lbl}>Cor de Destaque</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.accentColor}
                  onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                  disabled={!canEdit}
                  className="w-10 h-10 rounded cursor-pointer border border-slate-200 disabled:opacity-50" />
                <input className={`${inp} flex-1`} value={form.accentColor}
                  onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                  disabled={!canEdit} />
              </div>
            </div>
          </div>

          <div>
            <label className={lbl}>URL do Logo</label>
            <input className={inp} type="url" value={form.logoUrl}
              onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
              placeholder="https://..." disabled={!canEdit} />
          </div>

          <div>
            <label className={lbl}>Domínio Personalizado</label>
            <input className={inp} value={form.customDomain}
              onChange={e => setForm(f => ({ ...f, customDomain: e.target.value }))}
              placeholder="dashboard.minhaempresa.com" disabled={!canEdit || !canCustomDomain} />
            {!canCustomDomain && (
              <p className="text-xs text-amber-600 mt-1">
                Domínio próprio disponível apenas no plano <strong>Agência</strong>. <a href="/billing" className="underline font-semibold">Fazer upgrade</a>
              </p>
            )}
            {canCustomDomain && form.customDomain && (
              <p className="text-xs text-slate-500 mt-1">
                Adicione CNAME: <code className="bg-slate-100 px-1 rounded">{form.customDomain}</code> → <code className="bg-slate-100 px-1 rounded">cname.vercel-dns.com</code>
              </p>
            )}
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Preview</p>
            <div className="flex items-center gap-2">
              {form.logoUrl && <img src={form.logoUrl} alt="" className="h-8 w-auto" onError={e => (e.currentTarget.style.display = 'none')} />}
              <span className="font-bold text-slate-900">{form.companyName}</span>
              <span className="ml-auto px-3 py-1 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: form.primaryColor }}>
                Botão
              </span>
            </div>
          </div>

          {msg && (
            <p className={`text-sm ${status === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>{msg}</p>
          )}

          {canEdit && (
            <button type="submit" disabled={status === 'saving'}
              className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 transition-all"
              style={{ backgroundColor: form.primaryColor }}>
              {status === 'saving' ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          )}
        </form>

        <a href="/" className="block text-center mt-4 text-sm text-slate-400 hover:text-slate-700 transition-colors">
          ← Voltar ao Dashboard
        </a>
      </div>
    </div>
  )
}
