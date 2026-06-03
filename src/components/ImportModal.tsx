import { useState, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'

const TABLES = [
  { value: 'monthly_revenue', label: 'Faturamento Mensal' },
  { value: 'client_data',     label: 'Top Clientes' },
  { value: 'operator_payouts', label: 'Repasses por Operador' },
] as const

type TableValue = typeof TABLES[number]['value']

interface Props {
  onClose: () => void
  onImported: () => void
}

export default function ImportModal({ onClose, onImported }: Props) {
  const [table, setTable] = useState<TableValue>('monthly_revenue')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleImport() {
    if (!file) return
    setStatus('loading')
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada. Faça login novamente.')

      const text = await file.text()
      const isCSV = file.name.endsWith('.csv') || file.type === 'text/csv'
      const isJSON = file.name.endsWith('.json') || file.type === 'application/json'

      let body: string | object
      let contentType: string

      if (isCSV) {
        body = text
        contentType = 'text/csv'
      } else if (isJSON) {
        body = JSON.parse(text)
        contentType = 'application/json'
      } else {
        throw new Error('Formato inválido. Use .csv ou .json')
      }

      const res = await fetch(`/api/import?table=${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: isCSV ? (body as string) : JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')

      setStatus('success')
      setMessage(`${data.inserted} linha(s) importadas com sucesso`)
      setTimeout(() => { onImported(); onClose() }, 1500)
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message ?? 'Erro ao importar')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Upload className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Importar Dados</h2>
              <p className="text-xs text-slate-500">CSV ou JSON · substitui dados existentes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Table selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Tabela de destino
            </label>
            <div className="space-y-2">
              {TABLES.map(t => (
                <label key={t.value} className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  table === t.value
                    ? "border-orange-500 bg-orange-50"
                    : "border-slate-200 hover:border-slate-300"
                )}>
                  <input
                    type="radio"
                    name="table"
                    value={t.value}
                    checked={table === t.value}
                    onChange={() => setTable(t.value)}
                    className="accent-orange-500"
                  />
                  <span className={cn(
                    "text-sm font-semibold",
                    table === t.value ? "text-orange-700" : "text-slate-700"
                  )}>
                    {t.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* File picker */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Arquivo
            </label>
            <div
              onClick={() => inputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                file
                  ? "border-orange-400 bg-orange-50"
                  : "border-slate-200 hover:border-orange-300 hover:bg-orange-50/50"
              )}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-orange-700">
                  <FileText className="w-5 h-5" />
                  <span className="text-sm font-semibold truncate max-w-[200px]">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Clique para selecionar arquivo</p>
                  <p className="text-xs text-slate-400 mt-1">.csv ou .json</p>
                </>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              className="hidden"
              onChange={e => { setFile(e.target.files?.[0] ?? null); setStatus('idle') }}
            />
          </div>

          {/* Status feedback */}
          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {message}
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {message}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={!file || status === 'loading' || status === 'success'}
              className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importando...</>
              ) : 'Importar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
