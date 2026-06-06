import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe/server'
import { PLANS, type PlanKey } from '@/lib/stripe/config'
import { verifyUser } from '@/lib/supabase/admin'

function getAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { valid } = await verifyUser(req.headers.get('authorization'))
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan, organizationId, email } = await req.json()
  if (!plan || !(plan in PLANS)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const planConfig = PLANS[plan as PlanKey]
  if (!planConfig.priceId) {
    return NextResponse.json({ error: `Price ID not configured for ${plan}` }, { status: 500 })
  }

  const admin = getAdmin()
  const stripe = getStripe()

  const { data: org } = await (admin as any)
    .from('organizations')
    .select('id, name, stripe_customer_id')
    .eq('id', organizationId)
    .single()

  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  let customerId = org.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email ?? undefined,
      name: org.name,
      metadata: { organization_id: org.id },
    })
    customerId = customer.id
    await (admin as any).from('organizations').update({ stripe_customer_id: customerId }).eq('id', org.id)
  }

  const origin = req.headers.get('origin') ?? `https://${req.headers.get('host')}`

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { organization_id: org.id, plan },
    },
    metadata: { organization_id: org.id, plan },
    success_url: `${origin}/?subscribed=true`,
    cancel_url: `${origin}/billing?canceled=true`,
    locale: 'pt-BR',
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
