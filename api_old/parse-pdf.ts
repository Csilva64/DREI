import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyUser(authHeader: string | undefined): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.slice(7)
  const { data, error } = await supabase.auth.getUser(token)
  return !error && !!data.user
}

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authorized = await verifyUser(req.headers['authorization'] as string)
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' })

  const { text } = req.body
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return res.status(400).json({ error: 'No text content provided' })
  }

  if (!process.env.GOOGLE_GENAI_API_KEY) {
    return res.status(500).json({ error: 'GOOGLE_GENAI_API_KEY not configured' })
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `${SCHEMA_CONTEXT}\n\nPDF TEXT:\n${text.slice(0, 15000)}`,
    })

    const raw = response.text?.trim() ?? ''

    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    let parsed: any
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return res.status(422).json({ error: 'AI returned non-JSON response', raw: raw.slice(0, 500) })
    }

    if (parsed.error) {
      return res.status(422).json({ error: parsed.error, summary: parsed.summary })
    }

    return res.status(200).json({ ok: true, data: parsed })
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? 'AI parsing failed' })
  }
}
