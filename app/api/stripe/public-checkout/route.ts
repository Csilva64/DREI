import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/server'
import { PLANS, type PlanKey } from '@/lib/stripe/config'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// Public checkout — no auth. Collects email + company, provisions account via webhook.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { plan, email, companyName } = body

  if (!plan || !(plan in PLANS)) {
    return NextResponse.json({ error: 'Plano inválido' }, { status: 400, headers: CORS })
  }

  const planConfig = PLANS[plan as PlanKey]
  if (!planConfig.priceId) {
    return NextResponse.json({ error: 'Preço não configurado' }, { status: 500, headers: CORS })
  }

  const hasEmail = email && /^[^@]+@[^@]+\.[^@]+$/.test(email)
  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://dashboard.opcoia.com.br'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    ...(hasEmail ? { customer_email: email } : {}),
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { flow: 'public', email: hasEmail ? email : '', plan, company_name: companyName ?? '' },
    },
    metadata: { flow: 'public', email: hasEmail ? email : '', plan, company_name: companyName ?? '' },
    success_url: `${appUrl}/obrigado?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/?canceled=true`,
    locale: 'pt-BR',
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url }, { headers: CORS })
}
