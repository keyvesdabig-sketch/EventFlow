'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)
    if (!error) {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Link verschickt</CardTitle>
          <CardDescription>
            Prüfe deine E-Mails und klicke auf den Link um dich anzumelden.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>EventFlow</CardTitle>
        <CardDescription>Melde dich mit deiner E-Mail-Adresse an.</CardDescription>
      </CardHeader>
      <CardContent>
        {error === 'no_profile' && (
          <p className="text-sm text-red-600 mb-4">
            Kein Profil gefunden. Bitte wende dich an den Inhaber.
          </p>
        )}
        {error === 'auth_callback_failed' && (
          <p className="text-sm text-red-600 mb-4">
            Anmeldung fehlgeschlagen. Bitte versuche es erneut.
          </p>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sende Link...' : 'Magic Link senden'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>EventFlow</CardTitle>
          <CardDescription>Melde dich mit deiner E-Mail-Adresse an.</CardDescription>
        </CardHeader>
      </Card>
    }>
      <LoginForm />
    </Suspense>
  )
}
