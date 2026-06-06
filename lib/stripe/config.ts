// Plan → Stripe Price ID mapping. Fill price IDs from Stripe dashboard.
// Each plan has monthly price. Set via env so test/live keys swap cleanly.

export type PlanKey = 'starter' | 'pro' | 'enterprise'

export interface PlanConfig {
  key: PlanKey
  name: string
  priceMonthly: number // BRL, display only
  priceId: string      // Stripe Price ID
  features: string[]
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  starter: {
    key: 'starter',
    name: 'Starter',
    priceMonthly: 99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER ?? 'price_1Tf9lYASOPwwexHbR6dl5qXS',
    features: ['1 empresa', 'Upload manual de planilhas', 'DRE mensal/anual', 'Exportação PDF'],
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    priceMonthly: 198,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? 'price_1Tf9lZASOPwwexHb9F1iBjwP',
    features: ['Até 3 empresas', 'Importação API + PDF/IA', 'Repasses por operador', 'Comparativo YoY', 'Ranking top 5 clientes'],
  },
  enterprise: {
    key: 'enterprise',
    name: 'Agência',
    priceMonthly: 597,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE ?? 'price_1Tf9laASOPwwexHbznOIAVAN',
    features: ['Empresas ilimitadas', 'White-label', 'Domínio próprio', 'Suporte prioritário', 'Onboarding dedicado', 'SLA garantido'],
  },
}

export function getPlanByPriceId(priceId: string): PlanKey | null {
  const entry = Object.values(PLANS).find(p => p.priceId === priceId)
  return entry?.key ?? null
}
