import type { Booking, Role, EventStatus } from './types'
import { createClient } from './supabase/server'

export type RoleBookingStatus = 'open' | 'requested' | 'confirmed' | 'declined'

/**
 * Leitet den effektiven Buchungsstatus einer Rolle aus dem neuesten Booking ab.
 * Gibt 'open' wenn keine Bookings vorhanden, 'requested' für status='sent'.
 */
export function getRoleBookingStatus(bookings: Booking[], roleId: string): RoleBookingStatus {
  const roleBookings = bookings
    .filter(b => b.roleId === roleId)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))

  if (roleBookings.length === 0) return 'open'

  const latest = roleBookings[0]
  if (latest.status === 'sent') return 'requested'
  if (latest.status === 'confirmed') return 'confirmed'
  return 'declined'
}

/**
 * Gibt true zurück wenn alle Rollen eines Events confirmed sind.
 * Gibt false bei leerer Rollen-Liste.
 */
export function checkAllRolesConfirmed(roles: Role[], bookings: Booking[]): boolean {
  if (roles.length === 0) return false
  return roles.every(role => getRoleBookingStatus(bookings, role.id) === 'confirmed')
}

/**
 * Setzt den Event-Status in der DB. Shared helper, aufgerufen von Owner- und Freelancer-Actions.
 */
export async function transitionEventStatus(eventId: string, status: EventStatus): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('events').update({ status }).eq('id', eventId)
  if (error) throw new Error(`Failed to transition event to '${status}': ${error.message}`)
}
