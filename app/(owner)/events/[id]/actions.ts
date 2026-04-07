'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function deleteEventAction(eventId: string): Promise<{ error: string } | void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  const { data: person } = await supabase
    .from('persons')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (person?.role !== 'owner') return { error: 'Keine Berechtigung' }

  // Only allow deleting draft events
  const { data: event } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Event nicht gefunden' }
  if (event.status !== 'draft') return { error: 'Nur Entwürfe können gelöscht werden' }

  // Delete roles first (foreign key constraint)
  await supabase.from('roles').delete().eq('event_id', eventId)

  const { error } = await supabase.from('events').delete().eq('id', eventId)
  if (error) return { error: error.message }
}

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

/** Setzt Event-Status von draft → booking */
export async function startBookingAction(eventId: string): Promise<{ error: string } | void> {
  const { error, supabase } = await requireOwner()
  if (error || !supabase) return { error: error ?? 'Fehler' }

  const { error: dbError } = await supabase
    .from('events')
    .update({ status: 'booking' })
    .eq('id', eventId)
    .eq('status', 'draft')

  if (dbError) return { error: dbError.message }
  revalidatePath(`/events/${eventId}`)
}

/**
 * Weist Personen zu Rollen zu und erstellt Booking-Rows mit status='sent'.
 * Setzt roles.assigned_person_id für jede Zuteilung.
 */
export async function sendBookingRequests(
  eventId: string,
  assignments: { roleId: string; personId: string }[],
): Promise<{ error: string } | void> {
  const { error, supabase } = await requireOwner()
  if (error || !supabase) return { error: error ?? 'Fehler' }

  if (assignments.length === 0) return { error: 'Keine Zuteilungen vorhanden' }

  for (const { roleId, personId } of assignments) {
    // Vorherige offene Bookings für diese Rolle schliessen
    await supabase
      .from('bookings')
      .update({ status: 'declined' })
      .eq('role_id', roleId)
      .eq('status', 'sent')

    const { error: roleError } = await supabase
      .from('roles')
      .update({ assigned_person_id: personId })
      .eq('id', roleId)

    if (roleError) return { error: roleError.message }

    const { error: bookingError } = await supabase
      .from('bookings')
      .insert({ role_id: roleId, person_id: personId, status: 'sent' })

    if (bookingError) return { error: bookingError.message }
  }

  // Event auf 'booking' setzen falls noch 'draft'
  await supabase
    .from('events')
    .update({ status: 'booking' })
    .eq('id', eventId)
    .eq('status', 'draft')

  revalidatePath(`/events/${eventId}`)
}

/**
 * Ersetzt eine abgesagte Rolle durch eine neue Person.
 * Erstellt ein neues Booking, altes bleibt als Historie.
 */
export async function replaceBookingAction(
  roleId: string,
  newPersonId: string,
): Promise<{ error: string } | void> {
  const { error, supabase } = await requireOwner()
  if (error || !supabase) return { error: error ?? 'Fehler' }

  const { data: role } = await supabase
    .from('roles')
    .select('event_id')
    .eq('id', roleId)
    .single()

  if (!role) return { error: 'Rolle nicht gefunden' }

  const { error: roleError } = await supabase
    .from('roles')
    .update({ assigned_person_id: newPersonId })
    .eq('id', roleId)

  if (roleError) return { error: roleError.message }

  const { error: bookingError } = await supabase
    .from('bookings')
    .insert({ role_id: roleId, person_id: newPersonId, status: 'sent' })

  if (bookingError) return { error: bookingError.message }

  revalidatePath(`/events/${role.event_id}`)
}
