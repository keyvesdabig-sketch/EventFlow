'use client'

import { Suspense, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (!error) setSent(true)
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm space-y-3">
        <p className="label-control text-signal-green">Übertragung bestätigt</p>
        <h1 className="text-3xl font-bold text-foreground" style={{ letterSpacing: '-0.02em', fontFamily: 'var(--font-space-grotesk)' }}>
          Link verschickt.
        </h1>
        <p className="text-muted-foreground text-sm">
          Prüfe deine E-Mails und klicke auf den Link um dich anzumelden.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="space-y-1 -ml-1">
        <p className="label-control text-muted-foreground">EHC Chur Productions</p>
        <div className="flex items-center gap-4">
          <Image src="/Logo.png" alt="EventFlow Logo" width={64} height={64} className="object-contain" />
          <h1
            className="text-5xl font-bold text-foreground"
            style={{ letterSpacing: '-0.02em', fontFamily: 'var(--font-space-grotesk)' }}
          >
            Event
            <br />
            <span className="text-tally-red">Flow</span>
          </h1>
        </div>
      </div>

      {error === 'no_profile' && (
        <p className="label-control text-tally-red">
          Kein Profil gefunden — wende dich an den Inhaber.
        </p>
      )}
      {error === 'auth_callback_failed' && (
        <p className="label-control text-tally-red">
          Anmeldung fehlgeschlagen — bitte erneut versuchen.
        </p>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="label-control text-muted-foreground">
            E-Mail-Adresse
          </label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-level-3 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sende Link...' : 'Magic Link senden'}
        </Button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 -ml-1">
          <p className="label-control text-muted-foreground">EHC Chur Productions</p>
          <div className="flex items-center gap-4">
            <Image src="/Logo.png" alt="EventFlow Logo" width={64} height={64} className="object-contain" />
            <h1 className="text-5xl font-bold text-foreground" style={{ letterSpacing: '-0.02em', fontFamily: 'var(--font-space-grotesk)' }}>
              Event<br /><span className="text-tally-red">Flow</span>
            </h1>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
