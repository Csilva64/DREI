import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe/server'
import { getPlanByPriceId } from '@/lib/stripe/config'
import { sendWelcomeEmail } from '@/lib/email/resend'
import type Stripe from 'stripe'

function getAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'empresa'
}

// Provision a brand-new account from a public checkout (no prior signup)
async function provisionPublicAccount(opts: {
  email: string
  companyName: string
  plan: string
  customerId: string
  subscriptionId: string
  origin: string
}) {
  const admin = getAdmin()

  // 1. Create or find user
  let userId: string
  const { data: existing } = await admin.auth.admin.listUsers()
  const found = (existing?.users as any[])?.find((u: any) => u.email === opts.email)
  if (found) {
    userId = found.id
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: opts.email,
      email_confirm: true,
    })
    if (error || !created.user) throw new Error(`createUser: ${error?.message}`)
    userId = created.user.id
  }

  // 2. Create org (unique slug)
  const base = slugify(opts.companyName || opts.email.split('@')[0])
  let slug = base
  for (let i = 1; ; i++) {
    const { data: clash } = await (admin as any).from('organizations').select('id').eq('slug', slug).single()
    if (!clash) break
    slug = `${base}-${i}`
  }

  const { data: org, error: orgErr } = await (admin as any).from('organizations').insert({
    name: opts.companyName || opts.email.split('@')[0],
    slug,
    plan: opts.plan,
    subscription_status: 'active',
    stripe_customer_id: opts.customerId,
    stripe_subscription_id: opts.subscriptionId,
  }).select().single()
  if (orgErr) throw new Error(`createOrg: ${orgErr.message}`)

  await (admin as any).from('organization_branding').insert({
    organization_id: org.id,
    company_name: opts.companyName || slug,
  })
  await (admin as any).from('organization_members').insert({
    organization_id: org.id,
    user_id: userId,
    role: 'owner',
  })

  // 3. Magic link — land on /settings for first-time branding setup
  const { data: link } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: opts.email,
    options: { redirectTo: `${opts.origin}/settings` },
  })
  const loginUrl = (link as any)?.properties?.action_link ?? `${opts.origin}/settings`

  // 4. Welcome email
  console.log('[provision] sending welcome email to', opts.email)
  await sendWelcomeEmail({
    to: opts.email,
    companyName: opts.companyName || slug,
    loginUrl,
    plan: opts.plan,
  })
  console.log('[provision] done for', opts.email, 'org', org.id)
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
        const flow = session.metadata?.flow
        const plan = session.metadata?.plan ?? 'starter'
        const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://dashboard.opcoia.com.br'

        if (flow === 'public') {
          // Email: metadata may be empty string — use || and Stripe-collected email
          const email = session.metadata?.email
            || session.customer_email
            || (session.customer_details as any)?.email
            || ''
          if (!email) throw new Error('No email in checkout session')
          // New self-serve customer — provision account + email
          await provisionPublicAccount({
            email,
            companyName: session.metadata?.company_name || '',
            plan,
            customerId: session.customer as string,
            subscriptionId: session.subscription as string,
            origin,
          })
        } else {
          // Existing org upgrading
          const orgId = session.metadata?.organization_id
          if (orgId) {
            await (admin as any).from('organizations').update({
              stripe_subscription_id: session.subscription as string,
              subscription_status: 'active',
              plan,
            }).eq('id', orgId)
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const priceId = sub.items.data[0]?.price.id
        const plan = priceId ? getPlanByPriceId(priceId) : null
        const rawPeriodEnd = (sub as any).current_period_end ?? (sub.items.data[0] as any)?.current_period_end
        const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000).toISOString() : null
        await updateOrgByCustomer(sub.customer as string, {
          subscription_status: sub.status,
          plan: plan ?? undefined,
          current_period_end: periodEnd,
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
    console.error('[stripe-webhook] handler error:', event.type, err?.message, err?.stack)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
