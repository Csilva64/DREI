'use client'

import { useState, useRef } from 'react'
import { useSubscription } from '@/components/providers/SubscriptionProvider'
import { Upload, X, CheckCircle, AlertCircle, FileText, Sparkles, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const TABLES = [
  { value: 'monthly_revenue', label: 'Faturamento Mensal' },
  { value: 'client_data',     label: 'Top Clientes' },
  { value: 'operator_payouts', label: 'Repasses por Operador' },
] as const

type TableValue = typeof TABLES[number]['value']
type Step = 'select' | 'processing' | 'done' | 'error'
type FileKind = 'csv' | 'json' | 'pdf' | 'unknown'

interface FileEntry {
  file: File
  kind: FileKind
  table: TableValue // for csv/json (ignored for pdf — AI detects)
}

interface Props {
  onClose: () => void
  onImported: () => void
}

function detectKind(file: File): FileKind {
  const n = file.name.toLowerCase()
  if (n.endsWith('.csv')) return 'csv'
  if (n.endsWith('.json')) return 'json'
  if (n.endsWith('.pdf')) return 'pdf'
  return 'unknown'
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

async function extractPDFText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const { getDocument, GlobalWorkerOptions, version } = pdfjs
  GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map((item: any) => item.str).join(' '))
  }
  return pages.join('\n')
}

export default function ImportModal({ onClose, onImported }: Props) {
  const subscription = useSubscription()
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [step, setStep] = useState<Step>('select')
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const canUsePDF = subscription.features.pdfImport
  const hasPDF = entries.some(e => e.kind === 'pdf')

  function addFiles(fileList: FileList | null) {
    if (!fileList) return
    const newEntries: FileEntry[] = Array.from(fileList).map(file => ({
      file,
      kind: detectKind(file),
      table: 'monthly_revenue' as TableValue,
    }))
    setEntries(prev => [...prev, ...newEntries])
    setStep('select')
  }

  function removeEntry(idx: number) {
    setEntries(prev => prev.filter((_, i) => i !== idx))
  }

  function setEntryTable(idx: number, table: TableValue) {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, table } : e))
  }

  async function handleImport() {
    if (!entries.length) return

    // Validate
    const unknown = entries.find(e => e.kind === 'unknown')
    if (unknown) {
      setMessage(`Formato inválido: ${unknown.file.name}. Use .csv, .json ou .pdf`)
      setStep('error')
      return
    }
    if (hasPDF && !canUsePDF) {
      setMessage('Importação por PDF disponível apenas nos planos Pro e Agência. Faça upgrade em /billing.')
      setStep('error')
      return
    }

    setStep('processing')
    setMessage('')

    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) throw new Error('Sessão expirada. Faça login novamente.')
      const token = session.access_token

      // Accumulate rows per table across all files
      const buckets: Record<TableValue, any[]> = {
        monthly_revenue: [],
        client_data: [],
        operator_payouts: [],
      }

      for (let i = 0; i < entries.length; i++) {
        const e = entries[i]
        setProgress(`Processando ${i + 1}/${entries.length}: ${e.file.name}`)

        if (e.kind === 'pdf') {
          const text = await extractPDFText(e.file)
          const res = await fetch('/api/parse-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ text }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(`${e.file.name}: ${data.error}`)
          for (const t of TABLES) {
            const rows = data.data?.[t.value]
            if (Array.isArray(rows)) buckets[t.value].push(...rows)
          }
        } else if (e.kind === 'csv') {
          const text = await e.file.text()
          buckets[e.table].push(...parseCSV(text))
        } else if (e.kind === 'json') {
          const text = await e.file.text()
          const arr = JSON.parse(text)
          if (!Array.isArray(arr)) throw new Error(`${e.file.name}: JSON deve ser um array`)
          buckets[e.table].push(...arr)
        }
      }

      // One import call per non-empty bucket (combined rows = single replace)
      let totalTables = 0
      for (const t of TABLES) {
        const rows = buckets[t.value]
        if (!rows.length) continue
        setProgress(`Importando ${t.label}...`)
        const res = await fetch(`/api/import?table=${t.value}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(rows),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(`${t.label}: ${data.error}`)
        totalTables++
      }

      if (totalTables === 0) throw new Error('Nenhum dado válido encontrado nos arquivos')

      setStep('done')
      setMessage(`${entries.length} arquivo(s) → ${totalTables} tabela(s) importadas`)
      setTimeout(() => { onImported(); onClose() }, 1500)
    } catch (err: any) {
      setMessage(err.message ?? 'Erro ao importar')
      setStep('error')
    }
  }

  const kindBadge = (kind: FileKind) => {
    const map: Record<FileKind, string> = {
      csv: 'bg-emerald-100 text-emerald-700',
      json: 'bg-blue-100 text-blue-700',
      pdf: 'bg-purple-100 text-purple-700',
      unknown: 'bg-red-100 text-red-700',
    }
    return map[kind]
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Upload className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Importar Dados</h2>
              <p className="text-xs text-slate-500">CSV, JSON ou PDF · vários arquivos · substitui dados existentes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {(step === 'select' || step === 'error') && (
            <>
              {/* File picker */}
              <div onClick={() => inputRef.current?.click()} className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                entries.length ? "border-orange-400 bg-orange-50/50" : "border-slate-200 hover:border-orange-300 hover:bg-orange-50/50"
              )}>
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Clique para selecionar arquivos</p>
                <p className="text-xs text-slate-400 mt-1">.csv · .json · .pdf · múltiplos</p>
              </div>
              <input ref={inputRef} type="file" multiple
                accept=".csv,.json,.pdf,text/csv,application/json,application/pdf"
                className="hidden"
                onChange={e => addFiles(e.target.files)} />

              {/* File list */}
              {entries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {entries.length} arquivo(s)
                  </p>
                  {entries.map((e, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold uppercase", kindBadge(e.kind))}>
                        {e.kind}
                      </span>
                      <span className="text-xs text-slate-700 truncate flex-1 min-w-0">{e.file.name}</span>
                      {(e.kind === 'csv' || e.kind === 'json') && (
                        <select
                          value={e.table}
                          onChange={ev => setEntryTable(idx, ev.target.value as TableValue)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:border-orange-500 max-w-[140px]"
                        >
                          {TABLES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      )}
                      {e.kind === 'pdf' && (
                        <span className="text-[10px] text-purple-600 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> IA detecta
                        </span>
                      )}
                      <button onClick={() => removeEntry(idx)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {hasPDF && !canUsePDF && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs">
                  <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Importação por PDF com IA disponível nos planos <strong>Pro</strong> e <strong>Agência</strong>. <a href="/billing" className="underline font-semibold">Fazer upgrade</a></span>
                </div>
              )}

              {step === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {message}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleImport} disabled={!entries.length}
                  className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  {hasPDF ? <><Sparkles className="w-4 h-4" /> Processar e Importar</> : 'Importar'}
                </button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto" />
              <div>
                <p className="font-semibold text-slate-700">Importando...</p>
                <p className="text-xs text-slate-400 mt-1">{progress}</p>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="py-8 text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="font-semibold text-slate-700">{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
