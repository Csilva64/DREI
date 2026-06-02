import { useState, type ReactNode } from 'react';
import { X, Trash2, Save } from 'lucide-react';
import type { MonthlyRevenue } from '../types';
import { upsertRevenueRow, deleteRevenueRow } from '../lib/mutations';
import { cn } from '../lib/utils';

interface Props {
  row: MonthlyRevenue | null; // null = novo
  sortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function RevenueModal({ row, sortOrder, onClose, onSaved }: Props) {
  const isNew = !row?.id;

  const [form, setForm] = useState({
    month: row?.month ?? '',
    year: row?.year ?? new Date().getFullYear(),
    revenue: row?.revenue ?? 0,
    opco: row?.opco ?? 0,
    sabrina: row?.sabrina ?? 0,
    giovani: row?.giovani ?? 0,
    gabriella: row?.gabriella ?? 0,
    isHighlight: row?.isHighlight ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: string, value: unknown) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!form.month.trim()) return setError('Mês obrigatório');
    setSaving(true);
    setError(null);
    try {
      await upsertRevenueRow({ ...form, id: row?.id, sortOrder: row?.id ? (row as any).sortOrder ?? sortOrder : sortOrder });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!row?.id) return;
    setSaving(true);
    setError(null);
    try {
      await deleteRevenueRow(row.id);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">
            {isNew ? 'Novo Mês' : `Editar · ${row?.month}`}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mês" hint="ex: Mai/26">
              <input
                className={inputCls}
                value={form.month}
                onChange={e => set('month', e.target.value)}
                placeholder="Mai/26"
              />
            </Field>
            <Field label="Ano">
              <input
                type="number"
                className={inputCls}
                value={form.year}
                onChange={e => set('year', Number(e.target.value))}
              />
            </Field>
          </div>

          <Field label="Faturamento (R$)">
            <input
              type="number"
              className={inputCls}
              value={form.revenue}
              onChange={e => set('revenue', Number(e.target.value))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="OPCO">
              <input type="number" className={inputCls} value={form.opco} onChange={e => set('opco', Number(e.target.value))} />
            </Field>
            <Field label="Alizia">
              <input type="number" className={inputCls} value={form.sabrina} onChange={e => set('sabrina', Number(e.target.value))} />
            </Field>
            <Field label="Justus">
              <input type="number" className={inputCls} value={form.giovani} onChange={e => set('giovani', Number(e.target.value))} />
            </Field>
            <Field label="Antonella">
              <input type="number" className={inputCls} value={form.gabriella} onChange={e => set('gabriella', Number(e.target.value))} />
            </Field>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 accent-orange-500"
              checked={form.isHighlight}
              onChange={e => set('isHighlight', e.target.checked)}
            />
            <span className="text-sm font-medium text-slate-600">Destaque (mês especial)</span>
          </label>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 gap-3">
          {!isNew ? (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Excluir
            </button>
          ) : <div />}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all",
                saving ? "bg-orange-300" : "bg-orange-500 hover:bg-orange-600"
              )}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}{hint && <span className="ml-1 normal-case font-normal text-slate-400">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all";
