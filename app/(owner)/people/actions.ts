'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { validatePersonInput } from '@/lib/people'
import type { Skill } from '@/lib/types'

async function requireOwner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' as const, supabase: null }
  const { data: person } = await supabase
    .from('persons')
    .select('role')
    .eq('user_id', user.id)
    .single()
  if (person?.role !== 'owner') return { error: 'Keine Berechtigung' as const, supabase: null }
  return { error: null, supabase }
}

export async function updatePersonAction(
  id: string,
  data: { name: string; email: string; phone: string; skills: Skill[]; notes: string },
): Promise<{ error: string } | void> {
  const validationError = validatePersonInput(data)
  if (validationError) return validationError

  const { error, supabase } = await requireOwner()
  if (error || !supabase) return { error: error ?? 'Fehler' }

  const { error: dbError } = await supabase
    .from('persons')
    .update({
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      skills: data.skills,
      notes: data.notes,
    })
    .eq('id', id)

  if (dbError) return { error: dbError.message }
  revalidatePath('/people')
}

export async function deletePersonAction(id: string): Promise<{ error: string } | void> {
  const { error, supabase } = await requireOwner()
  if (error || !supabase) return { error: error ?? 'Fehler' }

  const { error: dbError } = await supabase
    .from('persons')
    .delete()
    .eq('id', id)

  if (dbError) return { error: dbError.message }
  revalidatePath('/people')
}

export async function createPersonAction(data: {
  name: string
  email: string
  phone: string
  skills: Skill[]
}): Promise<{ error: string } | { id: string }> {
  const validationError = validatePersonInput(data)
  if (validationError) return validationError

  const { error, supabase } = await requireOwner()
  if (error || !supabase) return { error: error ?? 'Fehler' }

  const { data: newPerson, error: dbError } = await supabase
    .from('persons')
    .insert({
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      skills: data.skills,
      role: 'freelancer',
    })
    .select('id')
    .single()

  if (dbError || !newPerson) return { error: dbError?.message ?? 'Person konnte nicht erstellt werden' }
  revalidatePath('/people')
  return { id: newPerson.id }
}

export async function generateAndSendInviteLinkAction(
  email: string,
): Promise<{ error: string } | { link: string; emailWarning?: string }> {
  const { error: ownerCheckError, supabase } = await requireOwner()
  if (ownerCheckError || !supabase) return { error: ownerCheckError ?? 'Fehler' }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${siteUrl}/auth/callback` },
  })

  if (linkError || !data?.properties?.action_link) {
    return { error: linkError?.message ?? 'Link konnte nicht generiert werden' }
  }

  const link = data.properties.action_link

  // Aktuellen (eingeloggten) User für den Link-Versand verwenden.
  // Bewusst KEIN .single() auf persons – es kann mehrere Owner geben (z.B. Dev + echter Owner).
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const ownerEmail = currentUser?.email

  let emailWarning: string | undefined

  if (ownerEmail) {
    const from = process.env.NOTIFICATION_FROM_EMAIL ?? 'EventFlow <noreply@example.com>'
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [ownerEmail],
          subject: `Login-Link für ${email}`,
          html: `
            <p>Du hast ein neues Crew-Mitglied eingeladen.</p>
            <p><strong>E-Mail:</strong> ${email}</p>
            <p>Login-Link (gültig 1 Stunde):</p>
            <p><a href="${link}">${link}</a></p>
            <p>Leite diesen Link an das neue Crew-Mitglied weiter.</p>
          `,
        }),
      })
      if (!res.ok) {
        emailWarning = `Link generiert, aber E-Mail konnte nicht gesendet werden (${res.status})`
      }
    } catch {
      emailWarning = 'Link generiert, aber E-Mail-Versand fehlgeschlagen'
    }
  }

  return { link, emailWarning }
}
