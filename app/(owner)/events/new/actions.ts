'use server'

import { createClient } from '@/lib/supabase/server'
import { materializeRoles } from '@/lib/events'
import { redirect } from 'next/navigation'
import type { ConcretePhase, Venue, RoleTemplate } from '@/lib/types'

export async function createEventAction(data: {
  templateId: string
  title: string
  phases: ConcretePhase[]
  venue: Venue
  notes: string
  roleTemplates: RoleTemplate[]
}): Promise<{ error: string } | void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  const { data: person } = await supabase
    .from('persons')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (person?.role !== 'owner') return { error: 'Keine Berechtigung' }

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      template_id: data.templateId,
      title: data.title,
      phases: data.phases as unknown as Record<string, unknown>[],
      venue: data.venue as unknown as Record<string, unknown>,
      status: 'draft',
      documents: [],
      notes: data.notes,
    })
    .select('id')
    .single()

  if (error || !event) {
    return { error: error?.message ?? 'Event konnte nicht erstellt werden' }
  }

  const roles = materializeRoles(event.id, data.roleTemplates)
  if (roles.length > 0) {
    const { error: rolesError } = await supabase.from('roles').insert(roles)
    if (rolesError) return { error: rolesError.message }
  }

  redirect(`/events/${event.id}`)
}
