import { useState, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle, FileText, Sparkles, Eye } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'

const TABLES = [
  { value: 'monthly_revenue', label: 'Faturamento Mensal' },
  { value: 'client_data',     label: 'Top Clientes' },
  { value: 'operator_payouts', label: 'Repasses por Operador' },
] as const

type TableValue = typeof TABLES[number]['value']
type Step = 'select' | 'parsing' | 'preview' | 'importing' | 'done' | 'error'

interface ParsedData {
  monthly_revenue?: any[]
  client_data?: any[]
  operator_payouts?: any[]
  summary?: string
}

interface Props {
  onClose: () => void
  onImported: () => void
}

async function extractPDFText(file: File): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

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
  const [table, setTable] = useState<TableValue>('monthly_revenue')
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<Step>('select')
  const [message, setMessage] = useState('')
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [summary, setSummary] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isPDF = file?.name.toLowerCase().endsWith('.pdf')

  async function handleAction() {
    if (!file) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada. Faça login novamente.')

      if (isPDF) {
        // Step 1: extract text + parse with AI
        setStep('parsing')
        const text = await extractPDFText(file)

        const res = await fetch('/api/parse-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ text }),
        })

        const result = await res.json()
        if (!res.ok) throw new Error(result.error ?? 'Erro ao interpretar PDF')

        setParsedData(result.data)
        setSummary(result.data.summary ?? '')
        setStep('preview')
      } else {
        // CSV/JSON: direct import
        await importFile(file, session.access_token, table)
      }
    } catch (err: any) {
      setMessage(err.message ?? 'Erro desconhecido')
      setStep('error')
    }
  }

  async function confirmPDFImport() {
    if (!parsedData) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setMessage('Sessão expirada'); setStep('error'); return }

    setStep('importing')
    try {
      // Import each table present in parsed data
      const tables = Object.entries(parsedData).filter(
        ([k, v]) => TABLES.some(t => t.value === k) && Array.isArray(v) && v.length > 0
      )

      for (const [tbl, rows] of tables) {
        const res = await fetch(`/api/import?table=${tbl}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(rows),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(`${tbl}: ${result.error}`)
      }

      setStep('done')
      setMessage(`${tables.length} tabela(s) importadas com sucesso`)
      setTimeout(() => { onImported(); onClose() }, 1500)
    } catch (err: any) {
      setMessage(err.message ?? 'Erro ao importar')
      setStep('error')
    }
  }

  async function importFile(f: File, token: string, tbl: string) {
    setStep('importing')
    const text = await f.text()
    const isCSV = f.name.endsWith('.csv') || f.type === 'text/csv'
    const isJSON = f.name.endsWith('.json') || f.type === 'application/json'

    if (!isCSV && !isJSON) throw new Error('Formato inválido. Use .csv, .json ou .pdf')

    const res = await fetch(`/api/import?table=${tbl}`, {
      method: 'POST',
      headers: {
        'Content-Type': isCSV ? 'text/csv' : 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: isCSV ? text : JSON.stringify(JSON.parse(text)),
    })

    const result = await res.json()
    if (!res.ok) throw new Error(result.error ?? 'Erro desconhecido')

    setStep('done')
    setMessage(`${result.inserted} linha(s) importadas com sucesso`)
    setTimeout(() => { onImported(); onClose() }, 1500)
  }

  const tableLabel = (key: string) => TABLES.find(t => t.value === key)?.label ?? key

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Upload className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Importar Dados</h2>
              <p className="text-xs text-slate-500">CSV, JSON ou PDF · substitui dados existentes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* STEP: select */}
          {(step === 'select' || step === 'error') && (
            <>
              {/* Table selector (only for CSV/JSON) */}
              {!isPDF && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Tabela de destino
                  </label>
                  <div className="space-y-2">
                    {TABLES.map(t => (
                      <label key={t.value} className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        table === t.value ? "border-orange-500 bg-orange-50" : "border-slate-200 hover:border-slate-300"
                      )}>
                        <input type="radio" name="table" value={t.value} checked={table === t.value}
                          onChange={() => setTable(t.value)} className="accent-orange-500" />
                        <span className={cn("text-sm font-semibold",
                          table === t.value ? "text-orange-700" : "text-slate-700")}>
                          {t.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* File picker */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Arquivo
                </label>
                <div onClick={() => inputRef.current?.click()} className={cn(
                  "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                  file ? "border-orange-400 bg-orange-50" : "border-slate-200 hover:border-orange-300 hover:bg-orange-50/50"
                )}>
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-orange-700">
                      <FileText className="w-5 h-5" />
                      <span className="text-sm font-semibold truncate max-w-[220px]">{file.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Clique para selecionar arquivo</p>
                      <p className="text-xs text-slate-400 mt-1">.csv · .json · .pdf</p>
                    </>
                  )}
                </div>
                <input ref={inputRef} type="file"
                  accept=".csv,.json,.pdf,text/csv,application/json,application/pdf"
                  className="hidden"
                  onChange={e => { setFile(e.target.files?.[0] ?? null); setStep('select') }} />
              </div>

              {isPDF && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs">
                  <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>PDF será interpretado com IA. Você poderá revisar os dados antes de confirmar a importação.</span>
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
                <button onClick={handleAction} disabled={!file}
                  className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  {isPDF ? <><Sparkles className="w-4 h-4" /> Analisar PDF</> : 'Importar'}
                </button>
              </div>
            </>
          )}

          {/* STEP: parsing */}
          {step === 'parsing' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto" />
              <div>
                <p className="font-semibold text-slate-700">Analisando PDF com IA...</p>
                <p className="text-xs text-slate-400 mt-1">Extraindo e interpretando os dados</p>
              </div>
            </div>
          )}

          {/* STEP: preview */}
          {step === 'preview' && parsedData && (
            <>
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
                <Eye className="w-4 h-4 flex-shrink-0" />
                <span>{summary || 'Dados extraídos. Revise antes de importar.'}</span>
              </div>

              {Object.entries(parsedData)
                .filter(([k, v]) => TABLES.some(t => t.value === k) && Array.isArray(v) && (v as any[]).length > 0)
                .map(([key, rows]) => (
                  <div key={key}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      {tableLabel(key)} — {(rows as any[]).length} linha(s)
                    </p>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto max-h-40">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50">
                              {Object.keys((rows as any[])[0]).map(h => (
                                <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(rows as any[]).slice(0, 8).map((row, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                {Object.values(row).map((v, j) => (
                                  <td key={j} className="px-3 py-1.5 text-slate-600 whitespace-nowrap">{String(v)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {(rows as any[]).length > 8 && (
                        <p className="text-xs text-slate-400 text-center py-2 border-t border-slate-100">
                          + {(rows as any[]).length - 8} linhas adicionais
                        </p>
                      )}
                    </div>
                  </div>
                ))}

              <div className="flex gap-3 pt-1">
                <button onClick={() => { setFile(null); setStep('select') }}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmPDFImport}
                  className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Confirmar Importação
                </button>
              </div>
            </>
          )}

          {/* STEP: importing */}
          {step === 'importing' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto" />
              <p className="font-semibold text-slate-700">Importando dados...</p>
            </div>
          )}

          {/* STEP: done */}
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
