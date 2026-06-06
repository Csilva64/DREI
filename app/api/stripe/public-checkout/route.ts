import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/server'
import { PLANS, type PlanKey } from '@/lib/stripe/config'

// Public checkout — no auth. Collects email + company, provisions account via webhook.
export async function POST(req: NextRequest) {
  const { plan, email, companyName } = await req.json()

  if (!plan || !(plan in PLANS)) {
    return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
  }
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
  }

  const planConfig = PLANS[plan as PlanKey]
  if (!planConfig.priceId) {
    return NextResponse.json({ error: 'Preço não configurado' }, { status: 500 })
  }

  const stripe = getStripe()
  const origin = req.headers.get('origin') ?? `https://${req.headers.get('host')}`

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { flow: 'public', email, plan, company_name: companyName ?? '' },
    },
    metadata: { flow: 'public', email, plan, company_name: companyName ?? '' },
    success_url: `${origin}/obrigado?email=${encodeURIComponent(email)}`,
    cancel_url: `${origin}/?canceled=true`,
    locale: 'pt-BR',
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
