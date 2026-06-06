import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe/server'
import { getPlanByPriceId } from '@/lib/stripe/config'
import type Stripe from 'stripe'

function getAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Stripe needs the raw body for signature verification
export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature failed: ${err.message}` }, { status: 400 })
  }

  const admin = getAdmin()

  async function updateOrgByCustomer(customerId: string, patch: Record<string, unknown>) {
    await (admin as any).from('organizations').update(patch).eq('stripe_customer_id', customerId)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.organization_id
        const plan = session.metadata?.plan
        if (orgId) {
          await (admin as any).from('organizations').update({
            stripe_subscription_id: session.subscription as string,
            subscription_status: 'active',
            plan: plan ?? undefined,
          }).eq('id', orgId)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const priceId = sub.items.data[0]?.price.id
        const plan = priceId ? getPlanByPriceId(priceId) : null
        await updateOrgByCustomer(sub.customer as string, {
          subscription_status: sub.status,
          plan: plan ?? undefined,
          current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
          stripe_subscription_id: sub.id,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await updateOrgByCustomer(sub.customer as string, {
          subscription_status: 'canceled',
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await updateOrgByCustomer(invoice.customer as string, {
          subscription_status: 'past_due',
        })
        break
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
