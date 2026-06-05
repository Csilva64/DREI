'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewTenantPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', slug: '', plan: 'starter', primaryColor: '#f97316', adminEmail: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/admin')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500 transition-colors'
  const lbl = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1'

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Novo Tenant</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div>
          <label className={lbl}>Nome da Empresa</label>
          <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label className={lbl}>Slug (subdomínio)</label>
          <input className={inp} value={form.slug}
            onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
            placeholder="minha-empresa" required />
          <p className="text-xs text-slate-500 mt-1">{form.slug}.yourdomain.com</p>
        </div>
        <div>
          <label className={lbl}>Email do Admin</label>
          <input className={inp} type="email" value={form.adminEmail}
            onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
            placeholder="admin@empresa.com" />
        </div>
        <div>
          <label className={lbl}>Plano</label>
          <select className={inp} value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Cor Principal</label>
          <div className="flex items-center gap-3">
            <input type="color" value={form.primaryColor}
              onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
              className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
            <span className="text-sm text-slate-400">{form.primaryColor}</span>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <a href="/admin" className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-400 text-sm text-center hover:bg-slate-800 transition-colors">
            Cancelar
          </a>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 disabled:opacity-50 transition-colors">
            {loading ? 'Criando...' : 'Criar Tenant'}
          </button>
        </div>
      </form>
    </div>
  )
}
