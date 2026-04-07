'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAllRolesConfirmed } from '@/lib/bookings'
import { transitionEventStatus } from '@/lib/bookings-server'
import { bookingMapper, roleMapper } from '@/lib/supabase/mappers'
import { revalidatePath } from 'next/cache'

/**
 * Freelancer beantwortet eine Buchungsanfrage.
 * Bei 'confirmed': prüft ob alle Rollen des Events bestätigt → ggf. Event-Status → confirmed
 */
export async function respondToBookingAction(
  bookingId: string,
  response: 'confirmed' | 'declined',
  declineReason?: string,
): Promise<{ error: string } | void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  // Sicherstellen dass das Booking dieser Person gehört
  const { data: bookingRow } = await supabase
    .from('bookings')
    .select('*, persons!bookings_person_id_fkey(user_id)')
    .eq('id', bookingId)
    .single()

  if (!bookingRow) return { error: 'Anfrage nicht gefunden' }
  if ((bookingRow as any).persons?.user_id !== user.id) return { error: 'Keine Berechtigung' }

  // Booking aktualisieren
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: response,
      responded_at: new Date().toISOString(),
      decline_reason: declineReason ?? null,
    })
    .eq('id', bookingId)

  if (updateError) return { error: updateError.message }

  // Bei Zusage: prüfen ob alle Rollen des Events confirmed
  if (response === 'confirmed') {
    const booking = bookingMapper.fromDb(bookingRow)

    const { data: roleRow } = await supabase
      .from('roles')
      .select('event_id')
      .eq('id', booking.roleId)
      .single()

    if (roleRow) {
      const eventId = roleRow.event_id

      const { data: allRoleRows } = await supabase
        .from('roles')
        .select('*')
        .eq('event_id', eventId)

      const { data: allBookingRows } = await supabase
        .from('bookings')
        .select('*')
        .in('role_id', (allRoleRows ?? []).map(r => r.id))

      const allRoles = (allRoleRows ?? []).map(roleMapper.fromDb)
      const allBookings = (allBookingRows ?? []).map(bookingMapper.fromDb)

      if (checkAllRolesConfirmed(allRoles, allBookings)) {
        await transitionEventStatus(eventId, 'confirmed')
      }
    }
  }

  revalidatePath('/home')
}
