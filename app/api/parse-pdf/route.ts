import { NextRequest, NextResponse } from 'next/server'
import { verifyUser } from '@/lib/supabase/admin'
import { GoogleGenAI } from '@google/genai'

const SCHEMA_CONTEXT = `
You are a data extraction assistant. Extract financial data from the provided PDF text and return ONLY valid JSON.

The dashboard has three tables:

1. monthly_revenue — monthly billing data:
   Fields: sort_order (int), month (string, e.g. "Jan/25"), year (int), revenue (number),
   opco (number), sabrina (number), giovani (number), gabriella (number), is_highlight (boolean)

2. client_data — top clients:
   Fields: rank (int), name (string), revenue (number), percentage (number)

3. operator_payouts — operator payouts:
   Fields: sort_order (int), name (string), total (number), percentage (number)

Return ONLY a JSON object with the keys that are present in the document:
{
  "monthly_revenue": [...] or omit if not present,
  "client_data": [...] or omit if not present,
  "operator_payouts": [...] or omit if not present,
  "summary": "brief description of what was found"
}

Rules:
- Return ONLY the JSON object, no markdown, no explanation
- Numeric values must be plain numbers (no currency symbols)
- If a field value is missing/unknown, use 0
- is_highlight should be true only for the highest revenue month
- sort_order should reflect the order rows appear in the document
- If the document doesn't contain recognizable financial table data, return {"error": "No financial data found", "summary": "..."}
`

export async function POST(request: NextRequest) {
  const authorized = await verifyUser(request.headers.get('authorization'))
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text } = await request.json()
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return NextResponse.json({ error: 'No text content provided' }, { status: 400 })
  }

  if (!process.env.GOOGLE_GENAI_API_KEY) {
    return NextResponse.json({ error: 'GOOGLE_GENAI_API_KEY not configured' }, { status: 500 })
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `${SCHEMA_CONTEXT}\n\nPDF TEXT:\n${text.slice(0, 15000)}`,
    })

    const raw = response.text?.trim() ?? ''
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    let parsed: any
    try { parsed = JSON.parse(cleaned) }
    catch { return NextResponse.json({ error: 'AI returned non-JSON response', raw: raw.slice(0, 500) }, { status: 422 }) }

    if (parsed.error) return NextResponse.json({ error: parsed.error, summary: parsed.summary }, { status: 422 })

    return NextResponse.json({ ok: true, data: parsed })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'AI parsing failed' }, { status: 500 })
  }
}
