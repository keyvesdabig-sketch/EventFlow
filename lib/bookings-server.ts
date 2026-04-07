import type { EventStatus } from './types'
import { createClient } from './supabase/server'

/**
 * Setzt den Event-Status in der DB. Shared helper, aufgerufen von Owner- und Freelancer-Actions.
 * Server-only: darf nicht in Client Components importiert werden.
 */
export async function transitionEventStatus(eventId: string, status: EventStatus): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('events').update({ status }).eq('id', eventId)
  if (error) throw new Error(`Failed to transition event to '${status}': ${error.message}`)
}
