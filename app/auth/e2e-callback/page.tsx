'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { linkPersonByIdAction } from '../dev-callback/actions'

// Dev-only page für E2E-Tests: empfängt Tokens als Query-Params (statt Hash),
// setzt Session im Browser und verknüpft Person via Admin-Client.
export default function E2ECallbackPage() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (!access_token || !refresh_token) {
      router.replace('/login?error=e2e_missing_tokens')
      return
    }

    const supabase = createClient()
    supabase.auth.setSession({ access_token, refresh_token }).then(async ({ data, error }) => {
      if (error || !data.user?.email) {
        router.replace('/login?error=e2e_session_failed')
      } else {
        await linkPersonByIdAction(data.user.id, data.user.email)
        router.replace('/')
      }
    })
  }, [params, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground label-control">E2E-Anmeldung läuft…</p>
    </div>
  )
}
