export interface Transaction {
  date: Date;
  valor: number;
  id: string;
  descricao: string;
  tipo: 'receita' | 'despesa';
  contraparte: string;
  month: string;
}

export interface MonthSummary {
  month: string;
  receita: number;
  despesa: number;
  resultado: number;
}

export interface TopEntry {
  nome: string;
  total: number;
  count: number;
}

export interface BankDashboard {
  transactions: Transaction[];
  totalReceita: number;
  totalDespesa: number;
  resultado: number;
  byMonth: MonthSummary[];
  topClientes: TopEntry[];
  topFornecedores: TopEntry[];
}

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function extractName(descricao: string): string {
  // "Transferência recebida/enviada pelo Pix - NAME - •••..."
  const pixMatch = descricao.match(/(?:recebida|enviada) pelo Pix - (.+?) - [•\d]/i);
  if (pixMatch) return pixMatch[1].trim();

  // "Compra no débito - NAME"
  const debitoMatch = descricao.match(/Compra no d[eé]bito - (.+)/i);
  if (debitoMatch) return debitoMatch[1].trim();

  // "Pagamento de boleto - NAME" or similar
  const boletoMatch = descricao.match(/Pagamento .+? - (.+)/i);
  if (boletoMatch) return boletoMatch[1].trim();

  // Fallback: everything before first " - "
  const parts = descricao.split(' - ');
  return parts[parts.length - 1]?.trim() || descricao.trim();
}

export function parseNubankCSV(csvText: string): BankDashboard {
  const lines = csvText.replace(/\r/g, '').trim().split('\n');

  const transactions: Transaction[] = [];

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;

    // Format: Data,Valor,Identificador,Descrição
    // Split on first 3 commas only (description may contain commas)
    const firstComma = line.indexOf(',');
    const secondComma = line.indexOf(',', firstComma + 1);
    const thirdComma = line.indexOf(',', secondComma + 1);

    if (firstComma < 0 || secondComma < 0 || thirdComma < 0) continue;

    const dateStr = line.slice(0, firstComma).trim();
    const valorStr = line.slice(firstComma + 1, secondComma).trim();
    const id = line.slice(secondComma + 1, thirdComma).trim();
    const descricao = line.slice(thirdComma + 1).trim();

    const valor = parseFloat(valorStr.replace(',', '.'));
    if (isNaN(valor)) continue;

    // Parse DD/MM/YYYY
    const dateParts = dateStr.split('/');
    if (dateParts.length !== 3) continue;
    const [day, month, year] = dateParts.map(Number);
    const date = new Date(year, month - 1, day);

    const monthKey = `${MONTH_NAMES[month - 1]}/${String(year).slice(2)}`;
    const tipo: 'receita' | 'despesa' = valor >= 0 ? 'receita' : 'despesa';
    const contraparte = extractName(descricao);

    transactions.push({ date, valor, id, descricao, tipo, contraparte, month: monthKey });
  }

  // Totals
  const totalReceita = transactions.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
  const totalDespesa = Math.abs(transactions.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0));
  const resultado = totalReceita - totalDespesa;

  // By month (sorted chronologically)
  const monthMap = new Map<string, { receita: number; despesa: number; date: Date }>();
  for (const t of transactions) {
    const existing = monthMap.get(t.month) ?? { receita: 0, despesa: 0, date: t.date };
    if (t.tipo === 'receita') existing.receita += t.valor;
    else existing.despesa += Math.abs(t.valor);
    monthMap.set(t.month, existing);
  }
  const byMonth: MonthSummary[] = Array.from(monthMap.entries())
    .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
    .map(([month, v]) => ({
      month,
      receita: v.receita,
      despesa: v.despesa,
      resultado: v.receita - v.despesa,
    }));

  // Top clientes (receita entries grouped by contraparte)
  const clientMap = new Map<string, { total: number; count: number }>();
  for (const t of transactions.filter(t => t.tipo === 'receita')) {
    const e = clientMap.get(t.contraparte) ?? { total: 0, count: 0 };
    e.total += t.valor;
    e.count++;
    clientMap.set(t.contraparte, e);
  }
  const topClientes: TopEntry[] = Array.from(clientMap.entries())
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Top fornecedores (despesa entries grouped by contraparte)
  const supplierMap = new Map<string, { total: number; count: number }>();
  for (const t of transactions.filter(t => t.tipo === 'despesa')) {
    const e = supplierMap.get(t.contraparte) ?? { total: 0, count: 0 };
    e.total += Math.abs(t.valor);
    e.count++;
    supplierMap.set(t.contraparte, e);
  }
  const topFornecedores: TopEntry[] = Array.from(supplierMap.entries())
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return { transactions, totalReceita, totalDespesa, resultado, byMonth, topClientes, topFornecedores };
}
