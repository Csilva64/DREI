import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BillingClient from './BillingClient'

async function getOrgForUser(userId: string) {
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: member } = await (admin as any)
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (!member) return null

  const { data: org } = await (admin as any)
    .from('organizations')
    .select('id, name, plan, subscription_status, trial_ends_at, current_period_end')
    .eq('id', member.organization_id)
    .single()

  return { org, role: member.role }
}

export default async function BillingPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const result = await getOrgForUser(user.id)
  if (!result?.org) redirect('/')

  return <BillingClient org={result.org} />
}
