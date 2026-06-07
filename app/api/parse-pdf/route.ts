import { NextRequest, NextResponse } from 'next/server'
import { verifyUser } from '@/lib/supabase/admin'
import { GoogleGenAI } from '@google/genai'

const SCHEMA_CONTEXT = `
You extract and AGGREGATE financial data from a document (which may have multiple sheets/pages such as per-FILE tabs, a RESUMO/summary tab, and a productivity/client tab) into a normalized dashboard model. Return ONLY valid JSON.

Three target tables:

1. monthly_revenue — ONE row PER MONTH (aggregated). Never output the same month twice.
   Fields: sort_order (int, chronological 0,1,2...), month (string "Mmm/AA" e.g. "Abr/26"), year (int),
   revenue (number = total billing that month), opco (number), sabrina (number), giovani (number),
   gabriella (number), is_highlight (boolean). opco/sabrina/giovani/gabriella are operator repasse
   amounts for that month (0 if unknown).

2. client_data — TOP 5 UNIQUE clients ranked by total revenue across the whole document.
   Fields: rank (int, sequential 1..5 with NO duplicates), name (string, unique client name),
   revenue (number = that client's TOTAL summed across all files/sheets), percentage (number = client revenue / sum of all clients * 100).
   Deduplicate: if the same client appears in many FILE sheets, SUM them into a single entry.

3. operator_payouts — one row per operator (e.g. OPCO, SABRINA, GIOVANI, GABRIELLA), totals summed.
   Fields: sort_order (int), name (string), total (number), percentage (number = total / sum of all * 100).

CRITICAL AGGREGATION RULES:
- AGGREGATE, do not list raw rows. Sum amounts; group by month and by client.
- monthly_revenue: exactly one entry per distinct month. If the file is a single month, output one row.
- client_data: exactly 5 entries max, ranks 1..5, each a DIFFERENT client, sorted by revenue desc. Never repeat a name. Never set every rank to 1.
- operator_payouts: one entry per operator, no duplicates.
- Ignore rows you cannot attribute to a month/client.

Return ONLY this JSON (omit a key if truly absent):
{ "monthly_revenue": [...], "client_data": [...], "operator_payouts": [...], "summary": "what was found" }

- Numbers are plain (no "R$", no thousands separators). Use 0 when unknown.
- is_highlight=true only for the single highest-revenue month.
- No markdown, no commentary, JSON only.
- If no recognizable financial data: {"error":"No financial data found","summary":"..."}
`

export async function POST(request: NextRequest) {
  const { valid, orgId } = await verifyUser(request.headers.get('authorization'))
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Server-side plan gating: PDF import requires Pro+
  if (orgId) {
    const { createClient } = await import('@supabase/supabase-js')
    const { getFeatures } = await import('@/lib/stripe/config')
    const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: org } = await (admin as any).from('organizations').select('plan').eq('id', orgId).single()
    if (org && !getFeatures(org.plan).pdfImport) {
      return NextResponse.json({ error: 'Importação por PDF disponível apenas nos planos Pro e Agência' }, { status: 403 })
    }
  }

  const { text } = await request.json()
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return NextResponse.json({ error: 'No text content provided' }, { status: 400 })
  }

  if (!process.env.GOOGLE_GENAI_API_KEY) {
    return NextResponse.json({ error: 'GOOGLE_GENAI_API_KEY not configured' }, { status: 500 })
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })
    const contents = `${SCHEMA_CONTEXT}\n\nDOCUMENT TEXT (may contain multiple sheets/pages):\n${text.slice(0, 40000)}`

    let response: any
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 16384,
          thinkingConfig: { thinkingBudget: 0 }, // disable thinking so tokens go to output
        },
      })
    } catch (e: any) {
      const m = String(e?.message ?? e)
      if (m.includes('429') || m.includes('RESOURCE_EXHAUSTED')) {
        return NextResponse.json({
          error: 'Limite da IA atingido (cota do Gemini). Tente novamente em ~1 minuto.',
        }, { status: 429 })
      }
      throw e
    }

    const raw = response.text ?? ''

    let parsed: any
    try {
      // responseMimeType json → raw should already be pure JSON
      parsed = JSON.parse(raw)
    } catch {
      // Fallback: strip fences + brace-slice
      try {
        let cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
        const first = cleaned.indexOf('{')
        const last = cleaned.lastIndexOf('}')
        if (first >= 0 && last > first) cleaned = cleaned.slice(first, last + 1)
        parsed = JSON.parse(cleaned)
      } catch {
        console.error('[parse-pdf] non-JSON. len=', raw.length, 'finishReason=', (response as any)?.candidates?.[0]?.finishReason, 'tail=', raw.slice(-200))
        return NextResponse.json({ error: 'AI returned non-JSON response', raw: raw.slice(0, 500) }, { status: 422 })
      }
    }

    if (parsed.error) return NextResponse.json({ error: parsed.error, summary: parsed.summary }, { status: 422 })

    return NextResponse.json({ ok: true, data: parsed })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'AI parsing failed' }, { status: 500 })
  }
}
