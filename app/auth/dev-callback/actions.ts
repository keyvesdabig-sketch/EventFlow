'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { linkPersonToUser } from '@/lib/auth-linking'

/**
 * Verknüpft eine persons-Row mit einem Auth-User anhand von userId und email.
 * Wird sowohl von dev-callback als auch e2e-callback aufgerufen.
 * Nutzt Admin-Client um RLS zu umgehen (kein SELECT-Policy-Problem beim ersten Login).
 */
export async function linkPersonByIdAction(userId: string, email: string): Promise<void> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  await linkPersonToUser(admin, userId, email)
}
