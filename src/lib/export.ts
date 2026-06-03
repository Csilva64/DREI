import type { MonthlyRevenue, ClientData, OperatorPayout, DashboardKPIs } from '../types'

// ─── CSV ──────────────────────────────────────────────────────────────────────

function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  return [headers, ...rows].map(r => r.map(escape).join(',')).join('\n')
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob(['﻿' + content], { type: mime }) // BOM for Excel UTF-8
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportCSV(
  revenue: MonthlyRevenue[],
  clients: ClientData[],
  operators: OperatorPayout[],
) {
  const sections: string[] = []

  sections.push('FATURAMENTO MENSAL')
  sections.push(toCSV(
    ['Mês', 'Ano', 'Faturamento', 'OPCO', 'Alizia', 'Justus', 'Antonella', 'Destaque'],
    revenue.map(r => [r.month, r.year, r.revenue, r.opco, r.sabrina, r.giovani, r.gabriella, r.isHighlight ? 'Sim' : 'Não'])
  ))

  sections.push('\nTOP CLIENTES')
  sections.push(toCSV(
    ['Rank', 'Cliente', 'Receita', '% Total'],
    clients.map(c => [c.rank, c.name, c.revenue, c.percentage])
  ))

  sections.push('\nREPASSES POR OPERADOR')
  sections.push(toCSV(
    ['Operador', 'Total', '% Total'],
    operators.map(o => [o.name, o.total, o.percentage])
  ))

  const date = new Date().toISOString().slice(0, 10)
  downloadBlob(sections.join('\n'), `relatorio-opco-${date}.csv`, 'text/csv;charset=utf-8')
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export async function exportPDF(
  revenue: MonthlyRevenue[],
  clients: ClientData[],
  operators: OperatorPayout[],
  kpis: DashboardKPIs,
) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const orange: [number, number, number] = [249, 115, 22]
  const dark: [number, number, number] = [15, 23, 42]
  const grey: [number, number, number] = [100, 116, 139]
  const W = doc.internal.pageSize.getWidth()

  const fmt = (v: number) =>
    'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const pct = (v: number) => v.toFixed(1) + '%'
  const date = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // Header bar
  doc.setFillColor(...orange)
  doc.rect(0, 0, W, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('DRE-I · OPCO', 14, 14)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Gerado em ${date}`, W - 14, 14, { align: 'right' })

  let y = 32

  // KPIs
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...dark)
  doc.text('Resumo Executivo', 14, y)
  y += 6

  const kpiData = [
    ['Faturamento Total', fmt(kpis.totalRevenue)],
    ['Melhor Mês', `${kpis.bestMonth.month} — ${fmt(kpis.bestMonth.value)}`],
    ['Média Mensal', fmt(kpis.monthlyAverage)],
    ['Total Repasses', fmt(kpis.totalPayouts)],
    ['YoY Growth', pct(kpis.yoyGrowth)],
  ]

  autoTable(doc, {
    startY: y,
    head: [['KPI', 'Valor']],
    body: kpiData,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: orange, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // Revenue table
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...dark)
  doc.text('Faturamento Mensal', 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Mês', 'Faturamento', 'OPCO', 'Alizia', 'Justus', 'Antonella']],
    body: revenue.map(r => [
      r.month,
      fmt(r.revenue),
      fmt(r.opco),
      r.sabrina > 0 ? fmt(r.sabrina) : '—',
      r.giovani > 0 ? fmt(r.giovani) : '—',
      r.gabriella > 0 ? fmt(r.gabriella) : '—',
    ]),
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: dark, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      const row = revenue[data.row.index]
      if (row?.isHighlight && data.row.section === 'body') {
        data.cell.styles.fillColor = [255, 237, 213]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // Two side-by-side tables: clients + operators
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...dark)
  doc.text('Top Clientes', 14, y)
  doc.text('Repasses por Operador', W / 2 + 4, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['#', 'Cliente', 'Receita', '%']],
    body: clients.map(c => [c.rank, c.name, fmt(c.revenue), pct(c.percentage)]),
    margin: { left: 14, right: W / 2 + 2 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    tableWidth: W / 2 - 18,
  })

  autoTable(doc, {
    startY: y,
    head: [['Operador', 'Total', '%']],
    body: operators.map(o => [o.name, fmt(o.total), pct(o.percentage)]),
    margin: { left: W / 2 + 4, right: 14 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    tableWidth: W / 2 - 18,
  })

  // Footer
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...grey)
    doc.text('OPCO Tours · DRE-I · Confidencial', 14, 290)
    doc.text(`Página ${i} de ${pages}`, W - 14, 290, { align: 'right' })
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  doc.save(`relatorio-opco-${dateStr}.pdf`)
}
