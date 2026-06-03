import { useState, useEffect, type ReactNode } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ChevronRight,
  UserCheck,
  LogOut,
  Pencil,
  Plus,
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
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { fetchKPIs, fetchRevenueData, fetchClientData, fetchOperatorData } from './lib/queries';
import type { MonthlyRevenue, ClientData, OperatorPayout, DashboardKPIs } from './types';
import { formatCurrency, formatPercent, cn } from './lib/utils';
import RevenueModal from './components/RevenueModal';
import { exportCSV, exportPDF } from './lib/export';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#6366f1', '#a855f7'];

function useDashboardData() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [revenueData, setRevenueData] = useState<MonthlyRevenue[]>([]);
  const [clientData, setClientData] = useState<ClientData[]>([]);
  const [operatorData, setOperatorData] = useState<OperatorPayout[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setDataLoading(true);
    Promise.all([fetchKPIs(), fetchRevenueData(), fetchClientData(), fetchOperatorData()])
      .then(([k, r, c, o]) => {
        setKpis(k);
        setRevenueData(r);
        setClientData(c);
        setOperatorData(o);
      })
      .catch(err => setDataError(err.message ?? 'Erro ao carregar dados'))
      .finally(() => setDataLoading(false));
  }, [tick]);

  return { kpis, revenueData, clientData, operatorData, dataLoading, dataError, refetch: () => setTick(t => t + 1) };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts'>('overview');
  const { session, loading, signOut } = useAuth();
  const { kpis, revenueData, clientData, operatorData, dataLoading, dataError, refetch } = useDashboardData();
  const [editRow, setEditRow] = useState<MonthlyRevenue | null | 'new'>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthForm />;
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (dataError || !kpis) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-red-500 text-sm font-medium">
        {dataError ?? 'Dados indisponíveis'}
      </div>
    );
  }

  const KPIS = kpis;
  const REVENUE_DATA = revenueData;
  const CLIENT_DATA = clientData;
  const OPERATOR_DATA = operatorData;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png.jpg" alt="OPCO" className="h-10 w-auto" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Fechamento Receptivo · <span className="text-orange-600">OPCO</span>
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Abr/2025 – Abr/2026 · Atualizado em Mai/2026
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner-sm">
              <button
                onClick={() => setActiveTab('overview')}
                className={cn(
                  "px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200",
                  activeTab === 'overview'
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('payouts')}
                className={cn(
                  "px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200",
                  activeTab === 'payouts'
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Repasses
              </button>
            </div>
            <button
              onClick={signOut}
              title="Sair"
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard 
                  title="Faturamento Total" 
                  value={formatCurrency(KPIS.totalRevenue)} 
                  icon={<DollarSign className="w-5 h-5 text-orange-600" />}
                  accent="orange"
                />
                <KpiCard 
                  title="Melhor Mês" 
                  value={KPIS.bestMonth.month} 
                  subtitle={formatCurrency(KPIS.bestMonth.value)}
                  icon={<Calendar className="w-5 h-5 text-blue-600" />}
                  accent="blue"
                />
                <KpiCard 
                  title="Média Mensal" 
                  value={formatCurrency(KPIS.monthlyAverage)} 
                  icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
                  accent="emerald"
                />
                <KpiCard 
                  title="YoY 2025 → 2026" 
                  value={formatPercent(KPIS.yoyGrowth)} 
                  subtitle="Impactado pelo TRIGGER 2808"
                  icon={KPIS.yoyGrowth < 0 ? <ArrowDownRight className="w-5 h-5 text-red-600" /> : <ArrowUpRight className="w-5 h-5 text-emerald-600" />}
                  accent={KPIS.yoyGrowth < 0 ? "red" : "emerald"}
                />
              </div>

              {/* Main Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Bar Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800">Evolução Mensal do Faturamento</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                      <span>Destaque (Out/25)</span>
                    </div>
                  </div>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="month" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tickFormatter={(val) => `R$${(val / 1000).toLocaleString()}k`}
                          tick={{ fontSize: 12, fill: '#64748b' }}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                        />
                        <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                          {REVENUE_DATA.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.isHighlight ? '#f97316' : '#cbd5e1'} 
                              className="transition-all duration-300 hover:fill-orange-400"
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Clients */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 mb-6">Top 5 Clientes</h3>
                  <div className="space-y-4">
                    {CLIENT_DATA.map((client) => (
                      <div key={client.name} className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 flex items-center justify-center bg-slate-100 text-slate-500 text-xs font-bold rounded-full group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                            {client.rank}
                          </span>
                          <span className="text-sm font-medium text-slate-700 truncate max-w-[150px]">
                            {client.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{formatPercent(client.percentage)}</p>
                          <p className="text-[10px] text-slate-400">{formatCurrency(client.revenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
                    <div className="flex justify-between items-center text-xs font-medium text-slate-400">
                      <span>Concentração Top 2</span>
                      <span className="text-slate-600">95.2%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 w-[95.2%]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="payouts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Operator Distribution */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                  <h3 className="font-bold text-slate-800 mb-6">Distribuição por Operador</h3>
                  <div className="h-[250px] w-full mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={OPERATOR_DATA}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="total"
                        >
                          {OPERATOR_DATA.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3 flex-grow">
                    {OPERATOR_DATA.map((op, idx) => (
                      <div key={op.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full")} style={{ backgroundColor: COLORS[idx] }}></div>
                          <span className="font-semibold text-slate-700">{op.name}</span>
                        </div>
                        <span className="text-slate-500">{formatPercent(op.percentage)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                      <span>Total Repasses</span>
                      <span>{formatCurrency(KPIS.totalPayouts)}</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Detalhamento Mensal</h3>
                    <button
                      onClick={() => setEditRow('new')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Novo Mês
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-medium">
                          <th className="px-6 py-4">Mês</th>
                          <th className="px-6 py-4">Faturamento</th>
                          <th className="px-6 py-4 font-bold text-orange-600 text-center">OPCO</th>
                          <th className="px-6 py-4 text-center">Alizia</th>
                          <th className="px-6 py-4 text-center">Justus</th>
                          <th className="px-6 py-4 text-center">Antonella</th>
                          <th className="px-4 py-4 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {REVENUE_DATA.map((row) => (
                          <tr key={row.month} className={cn("hover:bg-slate-50/50 transition-colors group", row.isHighlight && "bg-orange-50/30")}>
                            <td className="px-6 py-4 font-bold text-slate-700 flex items-center gap-2">
                              {row.month}
                              {row.isHighlight && <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>}
                            </td>
                            <td className="px-6 py-4 text-slate-500">{formatCurrency(row.revenue)}</td>
                            <td className="px-6 py-4 font-bold text-slate-900 text-center">{formatCurrency(row.opco)}</td>
                            <td className="px-6 py-4 text-slate-600 text-center">{row.sabrina > 0 ? formatCurrency(row.sabrina) : '—'}</td>
                            <td className="px-6 py-4 text-slate-600 text-center">{row.giovani > 0 ? formatCurrency(row.giovani) : '—'}</td>
                            <td className="px-6 py-4 text-slate-600 text-center">{row.gabriella > 0 ? formatCurrency(row.gabriella) : '—'}</td>
                            <td className="px-4 py-4 text-center">
                              <button
                                onClick={() => setEditRow(row)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-orange-100 text-slate-400 hover:text-orange-600 transition-all"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Notes */}
        <section className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold w-fit flex items-center gap-2">
                <Info className="w-3 h-3" />
                Notas de Fechamento
              </div>
              <h2 className="text-2xl font-bold">Observações do Período</h2>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0"></div>
                  <span><strong>Out/25:</strong> Atualizado com TRIGGER 2808 — Carnaval 2026.</span>
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                  <span><strong>ANTONELLA:</strong> Repasses a partir de Out/2025 (FILE 2808) e Fev/2026 (complementar).</span>
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 flex-shrink-0"></div>
                  <span>Todos os valores em <strong>BRL</strong>. Repasses brutos antes de abatimentos tributários.</span>
                </li>
              </ul>
            </div>
            <div className="hidden md:flex justify-end">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 w-full max-w-sm space-y-4 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Total Acumulado</span>
                  <span className="text-xl font-bold">{formatCurrency(KPIS.totalRevenue)}</span>
                </div>
                <div className="h-px bg-white/10 w-full"></div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => exportPDF(REVENUE_DATA, CLIENT_DATA, OPERATOR_DATA, KPIS)}
                    className="w-full bg-white text-slate-900 py-3 rounded-xl font-bold text-sm hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2 group"
                  >
                    Exportar PDF <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => exportCSV(REVENUE_DATA, CLIENT_DATA, OPERATOR_DATA)}
                    className="w-full bg-white/10 border border-white/20 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                  >
                    Exportar CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Subtle bg decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-slate-400">
            <UserCheck className="w-4 h-4" />
            <span className="text-xs">Gerado em Mai/2026 · Fechamento Receptivo OPCO</span>
          </div>
          <div className="flex gap-8 text-xs font-medium text-slate-400">
            <a href="#" className="hover:text-slate-900 transition-colors">Suporte</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Documetação</a>
            <button onClick={() => exportCSV(REVENUE_DATA, CLIENT_DATA, OPERATOR_DATA)} className="hover:text-slate-900 transition-colors">Exportação CSV</button>
          </div>
        </div>
      </footer>

      {editRow !== null && (
        <RevenueModal
          row={editRow === 'new' ? null : editRow}
          sortOrder={REVENUE_DATA.length}
          onClose={() => setEditRow(null)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}

function KpiCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  accent 
}: { 
  title: string; 
  value: string; 
  subtitle?: string; 
  icon: ReactNode; 
  accent: 'orange' | 'blue' | 'emerald' | 'red'
}) {
  const accentColors = {
    orange: 'border-orange-500 bg-orange-50/30',
    blue: 'border-blue-500 bg-blue-50/30',
    emerald: 'border-emerald-500 bg-emerald-50/30',
    red: 'border-red-500 bg-red-50/30',
  };

  return (
    <div className={cn(
      "bg-white p-5 rounded-2xl shadow-sm border-l-4 transition-all duration-300 hover:shadow-md hover:-translate-y-1",
      accentColors[accent]
    )}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-black text-slate-900">{value}</div>
        {subtitle && <div className="text-xs text-slate-500 font-medium">{subtitle}</div>}
      </div>
    </div>
  );
}

