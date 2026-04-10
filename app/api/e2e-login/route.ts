import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse, NextRequest } from 'next/server'

/**
 * Dev-only endpoint für E2E-Tests.
 * Gibt {access_token, refresh_token} als JSON zurück — kein Redirect durch externe Domains.
 *
 * Strategie: action_link direkt via GET abrufen (wie der Browser), Tokens aus dem
 * Location-Header der 302-Antwort extrahieren (impliziter Flow → Tokens im Hash-Fragment).
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Not found', { status: 404 })
  }

  const email = request.nextUrl.searchParams.get('email') ?? 'keyvesdabig@gmail.com'

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // Schritt 1: Magic-Link generieren
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (error || !data?.properties?.action_link) {
    return new Response(`Fehler beim Link-Generieren: ${error?.message}`, { status: 500 })
  }

  // Schritt 2: action_link als GET abrufen — Supabase verifiziert intern und leitet weiter.
  // redirect: 'manual' → wir bekommen den 302 mit Location-Header statt dem finalen Redirect.
  const verifyRes = await fetch(data.properties.action_link, { redirect: 'manual' })

  const location = verifyRes.headers.get('location')
  if (!location) {
    return new Response(
      `Kein Location-Header (status ${verifyRes.status}): ${await verifyRes.text()}`,
      { status: 500 },
    )
  }

  // Schritt 3: Tokens aus dem Hash-Fragment der Redirect-URL extrahieren
  // Format: https://…/auth/callback#access_token=…&refresh_token=…&…
  const fragmentIndex = location.indexOf('#')
  if (fragmentIndex === -1) {
    return new Response(`Kein Hash-Fragment in Redirect-URL: ${location}`, { status: 500 })
  }

  const hashParams = new URLSearchParams(location.slice(fragmentIndex + 1))
  const access_token = hashParams.get('access_token')
  const refresh_token = hashParams.get('refresh_token')

  if (!access_token || !refresh_token) {
    return new Response(`Tokens fehlen im Hash-Fragment: ${location}`, { status: 500 })
  }

  return NextResponse.json({ access_token, refresh_token })
}
