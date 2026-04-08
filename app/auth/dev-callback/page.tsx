'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Dev-only page: picks up implicit-flow tokens from the URL hash
// and establishes a browser session, then redirects to dashboard.
export default function DevCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (!access_token || !refresh_token) {
      router.replace('/login?error=auth_callback_failed')
      return
    }

    const supabase = createClient()
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) {
        router.replace('/login?error=auth_callback_failed')
      } else {
        router.replace('/')
      }
    })
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground label-control">Anmeldung läuft…</p>
    </div>
  )
}
