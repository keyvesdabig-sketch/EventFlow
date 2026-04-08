import { createClient } from '@supabase/supabase-js'
import { NextResponse, NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Not found', { status: 404 })
  }

  const email = request.nextUrl.searchParams.get('email') ?? 'keyvesdabig@gmail.com'

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: 'http://localhost:3000/auth/dev-callback' },
  })

  if (error || !data?.properties?.action_link) {
    return new Response(`Fehler: ${error?.message}`, { status: 500 })
  }

  return NextResponse.redirect(data.properties.action_link)
}
