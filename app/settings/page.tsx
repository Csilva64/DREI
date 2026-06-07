'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useSubscription } from '@/components/providers/SubscriptionProvider'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  useAuth() // auth context loaded for session
  const subscription = useSubscription()
  const canCustomDomain = subscription.features.customDomain
  const [form, setForm] = useState({
    companyName: '',
    primaryColor: '#f97316',
    accentColor: '#3b82f6',
    logoUrl: '',
    customDomain: '',
  })
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  async function uploadLogo(file: File) {
    setUploading(true)
    setMsg('')
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) throw new Error('Sessão expirada')
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setForm(f => ({ ...f, logoUrl: data.logoUrl }))
      setStatus('saved')
      setMsg('Logo enviado. Recarregue para ver no dashboard.')
    } catch (err: any) {
      setStatus('error')
      setMsg(err.message ?? 'Erro ao enviar logo')
    } finally {
      setUploading(false)
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadLogo(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (!canEdit) return
    const file = e.dataTransfer.files?.[0]
    if (file) uploadLogo(file)
  }

  // Populate form from the logged-in org's branding when it loads
  useEffect(() => {
    if (subscription.branding) {
      setForm(f => ({
        ...f,
        companyName: subscription.branding!.companyName,
        primaryColor: subscription.branding!.primaryColor,
        accentColor: subscription.branding!.accentColor,
        logoUrl: subscription.branding!.logoUrl ?? '',
      }))
    }
  }, [subscription.branding])

  // owner/admin can edit; default allow while loading
  const canEdit = !subscription.role || ['owner', 'admin'].includes(subscription.role)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) throw new Error('Sessão expirada. Faça login novamente.')

      const res = await fetch('/api/settings/branding', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
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
            <label className={lbl}>Logo</label>
            <label
              onDragOver={e => { e.preventDefault(); if (canEdit) setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-colors",
                canEdit ? "cursor-pointer" : "cursor-not-allowed",
                dragging ? "border-orange-500 bg-orange-50"
                  : canEdit ? "border-slate-300 hover:border-orange-400" : "border-slate-200"
              )}
            >
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="logo" className="h-12 w-12 object-contain rounded-lg border border-slate-200 bg-white p-1 flex-shrink-0"
                  onError={e => (e.currentTarget.style.display = 'none')} />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              )}
              <div className="flex-1 text-sm">
                <span className={cn("font-semibold", canEdit ? "text-orange-600" : "text-slate-300")}>
                  {uploading ? 'Enviando...' : dragging ? 'Solte o arquivo aqui' : (form.logoUrl ? 'Trocar logo' : 'Arraste ou clique para enviar')}
                </span>
                <p className="text-xs text-slate-400 mt-0.5">PNG, JPG, SVG, WEBP ou GIF · máx. 2 MB</p>
              </div>
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                className="hidden" disabled={!canEdit || uploading}
                onChange={handleLogoUpload} />
            </label>
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
