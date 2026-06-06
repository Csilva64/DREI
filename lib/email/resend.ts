import { Resend } from 'resend'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

// Sender — use verified domain in production, resend.dev for testing
const FROM = process.env.RESEND_FROM ?? 'DRE-I <onboarding@resend.dev>'

export async function sendWelcomeEmail(opts: {
  to: string
  companyName: string
  loginUrl: string
  plan: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping welcome email')
    return
  }

  const planLabel = { starter: 'Starter', pro: 'Pro', enterprise: 'Agência' }[opts.plan] ?? opts.plan

  await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: `Bem-vindo ao DRE-I — sua conta está pronta 🎉`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <div style="background:#f97316;padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">DRE-I</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Olá, ${opts.companyName} 👋</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">
        Seu pagamento foi confirmado e sua conta no plano <strong>${planLabel}</strong> está ativa.
        Clique no botão abaixo para acessar seu dashboard — sem precisar de senha.
      </p>
      <a href="${opts.loginUrl}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#f97316;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;">
        Acessar meu Dashboard →
      </a>
      <p style="color:#94a3b8;font-size:12px;line-height:1.6;">
        Este link é válido por 24 horas. Se expirar, acesse o dashboard e use "Entrar" com seu e-mail.
      </p>
      <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;">
      <p style="color:#94a3b8;font-size:11px;">DRE-I · Dashboard financeiro · Confidencial</p>
    </div>
  </div>
</body>
</html>`,
  })
}
