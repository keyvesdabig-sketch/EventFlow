'use server'

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
