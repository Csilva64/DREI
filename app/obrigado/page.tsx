'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ObrigadoContent() {
  const params = useSearchParams()
  const email = params.get('email') ?? ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center space-y-4">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold text-slate-900">Pagamento confirmado!</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Enviamos um link de acesso para <strong className="text-slate-700">{email || 'seu e-mail'}</strong>.
          Clique no link do e-mail para entrar no seu dashboard — sem precisar de senha.
        </p>
        <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500">
          Não recebeu? Verifique a caixa de spam ou acesse o dashboard e use "Entrar" com seu e-mail.
        </div>
        <a href="/" className="block w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors">
          Ir para o login
        </a>
      </div>
    </div>
  )
}

export default function ObrigadoPage() {
  return (
    <Suspense fallback={null}>
      <ObrigadoContent />
    </Suspense>
  )
}
