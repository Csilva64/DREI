import { useState, useCallback, type ReactNode } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Upload,
  LogOut,
  Users,
  ShoppingCart,
  BarChart2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { parseNubankCSV, type BankDashboard } from './lib/csvParser';
import { saveDashboard, loadDashboard, clearDashboard } from './lib/bankStore';
import { cn } from './lib/utils';

const COLORS = {
  receita: '#10b981',
  despesa: '#f97316',
  resultado: '#3b82f6',
};

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function useBankData() {
  const [data, setData] = useState<BankDashboard | null>(() => loadDashboard());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const importCSV = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseNubankCSV(text);
      if (parsed.transactions.length === 0) throw new Error('Nenhuma transação encontrada no arquivo.');
      saveDashboard(parsed);
      setData(parsed);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao processar arquivo.');
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    clearDashboard();
    setData(null);
    setError(null);
  }, []);

  return { data, error, loading, importCSV, clear };
}

export default function App() {
  const { session, loading: authLoading, signOut } = useAuth();
  const { data, error, loading, importCSV, clear } = useBankData();
  const [activeTab, setActiveTab] = useState<'overview' | 'transacoes'>('overview');
  const [txSearch, setTxSearch] = useState('');

  if (authLoading) return <Spinner />;
  if (!session) return <AuthForm />;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) importCSV(f);
    e.target.value = '';
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              DRE-I · <span className="text-orange-600">OPCO</span>
            </h1>
            <p className="text-xs text-slate-500">
              {data
                ? `${data.transactions.length} transações · ${data.byMonth.length} meses`
                : 'Nenhum extrato carregado'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['overview', 'transacoes'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-3 py-1.5 text-sm font-semibold rounded-lg transition-all',
                      activeTab === tab ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {tab === 'overview' ? 'Visão Geral' : 'Transações'}
                  </button>
                ))}
              </div>
            )}
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold cursor-pointer hover:bg-orange-600 transition-colors">
              <Upload className="w-4 h-4" />
              {data ? 'Novo Extrato' : 'Carregar Extrato'}
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </label>
            {data && (
              <button
                onClick={clear}
                className="px-3 py-2 text-sm text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                Limpar
              </button>
            )}
            <button
              onClick={signOut}
              title="Sair"
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500">Processando extrato...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Empty state */}
        {!data && !loading && (
          <EmptyState onFile={handleFile} />
        )}

        {/* Dashboard */}
        {data && !loading && (
          <AnimatePresence mode="wait">
            {activeTab === 'overview' ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-8"
              >
                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <KpiCard
                    title="Receita Total"
                    value={formatCurrency(data.totalReceita)}
                    icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
                    accent="emerald"
                  />
                  <KpiCard
                    title="Despesa Total"
                    value={formatCurrency(data.totalDespesa)}
                    icon={<TrendingDown className="w-5 h-5 text-orange-600" />}
                    accent="orange"
                  />
                  <KpiCard
                    title={data.resultado >= 0 ? 'Lucro' : 'Prejuízo'}
                    value={formatCurrency(Math.abs(data.resultado))}
                    subtitle={data.resultado >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
                    icon={<DollarSign className={cn('w-5 h-5', data.resultado >= 0 ? 'text-blue-600' : 'text-red-600')} />}
                    accent={data.resultado >= 0 ? 'blue' : 'red'}
                  />
                </div>

                {/* Monthly Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-slate-400" />
                    Evolução Mensal
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.byMonth} margin={{ top: 4, right: 8, left: 8, bottom: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          dy={8}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          width={60}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number, name: string) => [
                            formatCurrency(value),
                            name === 'receita' ? 'Receita' : name === 'despesa' ? 'Despesa' : 'Resultado',
                          ]}
                        />
                        <Legend
                          formatter={name => name === 'receita' ? 'Receita' : name === 'despesa' ? 'Despesa' : 'Resultado'}
                        />
                        <Bar dataKey="receita" fill={COLORS.receita} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="despesa" fill={COLORS.despesa} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Clientes & Fornecedores */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RankingCard
                    title="Principais Clientes"
                    subtitle="Maiores fontes de receita"
                    icon={<Users className="w-5 h-5 text-emerald-600" />}
                    items={data.topClientes}
                    total={data.totalReceita}
                    accent="emerald"
                  />
                  <RankingCard
                    title="Principais Fornecedores"
                    subtitle="Maiores destinos de despesa"
                    icon={<ShoppingCart className="w-5 h-5 text-orange-600" />}
                    items={data.topFornecedores}
                    total={data.totalDespesa}
                    accent="orange"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="transacoes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
                    <h3 className="font-bold text-slate-800">
                      Transações <span className="text-slate-400 font-normal text-sm">({data.transactions.length})</span>
                    </h3>
                    <input
                      type="text"
                      placeholder="Buscar descrição..."
                      value={txSearch}
                      onChange={e => setTxSearch(e.target.value)}
                      className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-orange-400 w-64"
                    />
                  </div>
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr className="text-slate-500 text-xs font-semibold">
                          <th className="px-4 py-3 text-left">Data</th>
                          <th className="px-4 py-3 text-left">Descrição</th>
                          <th className="px-4 py-3 text-left">Contraparte</th>
                          <th className="px-4 py-3 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.transactions
                          .filter(t =>
                            !txSearch || t.descricao.toLowerCase().includes(txSearch.toLowerCase()) ||
                            t.contraparte.toLowerCase().includes(txSearch.toLowerCase())
                          )
                          .slice(0, 300)
                          .map(t => (
                            <tr key={t.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                                {t.date instanceof Date
                                  ? t.date.toLocaleDateString('pt-BR')
                                  : String(t.date)}
                              </td>
                              <td className="px-4 py-2.5 text-slate-600 max-w-[300px] truncate">
                                {t.descricao}
                              </td>
                              <td className="px-4 py-2.5 text-slate-700 max-w-[200px] truncate font-medium">
                                {t.contraparte}
                              </td>
                              <td className={cn(
                                'px-4 py-2.5 text-right font-semibold whitespace-nowrap',
                                t.tipo === 'receita' ? 'text-emerald-600' : 'text-red-500'
                              )}>
                                {t.tipo === 'receita' ? '+' : ''}
                                {formatCurrency(t.valor)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-8 text-center text-xs text-slate-400 border-t border-slate-200 mt-8">
        DRE-I OPCO · Powered by OPCO AI
      </footer>
    </div>
  );
}

function Spinner() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <span className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ onFile }: { onFile: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
      <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center">
        <Upload className="w-8 h-8 text-orange-500" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Carregue seu extrato bancário</h2>
        <p className="text-slate-500 text-sm max-w-sm">
          Importe um CSV do Nubank (ou formato similar) para visualizar Receita, Despesa, Resultado, Clientes e Fornecedores.
        </p>
      </div>
      <label className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-bold rounded-xl cursor-pointer hover:bg-orange-600 transition-colors">
        <Upload className="w-5 h-5" />
        Selecionar arquivo CSV
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
      </label>
      <p className="text-xs text-slate-400">Formato: Data, Valor, Identificador, Descrição</p>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  accent: 'emerald' | 'orange' | 'blue' | 'red';
}) {
  const accentMap = {
    emerald: 'border-emerald-500 bg-emerald-50/30',
    orange: 'border-orange-500 bg-orange-50/30',
    blue: 'border-blue-500 bg-blue-50/30',
    red: 'border-red-500 bg-red-50/30',
  };
  return (
    <div className={cn('bg-white p-5 rounded-2xl shadow-sm border-l-4 hover:shadow-md hover:-translate-y-0.5 transition-all', accentMap[accent])}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">{icon}</div>
      </div>
      <div className="text-2xl font-black text-slate-900">{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function RankingCard({
  title,
  subtitle,
  icon,
  items,
  total,
  accent,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  items: { nome: string; total: number; count: number }[];
  total: number;
  accent: 'emerald' | 'orange';
}) {
  const barColor = accent === 'emerald' ? 'bg-emerald-500' : 'bg-orange-500';
  const badgeColor = accent === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">{icon}</div>
        <div>
          <h3 className="font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-4">
        {items.map((item, i) => {
          const pct = total > 0 ? (item.total / total) * 100 : 0;
          return (
            <div key={item.nome}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn('text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0', badgeColor)}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-700 truncate">{item.nome}</span>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(item.total)}</span>
                  <span className="text-xs text-slate-400 ml-1.5">{pct.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full', barColor)} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
