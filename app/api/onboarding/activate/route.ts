import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe/server'

function getAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET ?session_id= → returns the email for that paid checkout (to prefill)
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    const email = session.customer_details?.email || session.customer_email || ''
    const paid = session.payment_status === 'paid' || session.status === 'complete'
    return NextResponse.json({ email, paid })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

// POST { session_id, password } → verifies paid checkout, sets the user's password
export async function POST(req: NextRequest) {
  const { sessionId, password } = await req.json()
  if (!sessionId || !password || password.length < 6) {
    return NextResponse.json({ error: 'Sessão e senha (mín. 6 caracteres) obrigatórios' }, { status: 400 })
  }

  // Verify the Stripe checkout is real + paid
  let email = ''
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    const paid = session.payment_status === 'paid' || session.status === 'complete'
    if (!paid) return NextResponse.json({ error: 'Pagamento não confirmado' }, { status: 402 })
    email = session.customer_details?.email || session.customer_email || ''
  } catch {
    return NextResponse.json({ error: 'Sessão de pagamento inválida' }, { status: 400 })
  }

  if (!email) return NextResponse.json({ error: 'E-mail não encontrado na sessão' }, { status: 400 })

  const admin = getAdmin()

  // Find the provisioned user
  const { data: users } = await admin.auth.admin.listUsers()
  const user = (users?.users as any[])?.find((u: any) => u.email === email)
  if (!user) return NextResponse.json({ error: 'Conta ainda sendo provisionada. Aguarde alguns segundos e tente de novo.' }, { status: 404 })

  // Set password
  const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, email })
}
