'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TemplatePhase, RoleTemplate } from '@/lib/types'

export async function updateTemplateAction(
  id: string,
  data: {
    name: string
    phases: TemplatePhase[]
    roleTemplates: RoleTemplate[]
    defaultVenueInfo: string
  }
): Promise<{ error: string } | void> {
  if (!data.name.trim()) return { error: 'Name darf nicht leer sein' }
  for (const p of data.phases) {
    if (!p.name.trim()) return { error: 'Jede Phase braucht einen Namen' }
    if (p.defaultDurationHours <= 0) return { error: 'Phasendauer muss > 0 sein' }
  }
  for (const r of data.roleTemplates) {
    if (!r.title.trim()) return { error: 'Jede Rolle braucht einen Titel' }
    if (r.count < 1) return { error: 'Rollenanzahl muss ≥ 1 sein' }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  const { data: person } = await supabase
    .from('persons')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (person?.role !== 'owner') return { error: 'Keine Berechtigung' }

  const { error } = await supabase
    .from('production_templates')
    .update({
      name: data.name.trim(),
      phases: data.phases as unknown as Record<string, unknown>[],
      role_templates: data.roleTemplates.map(r => ({
        title: r.title.trim(),
        count: r.count,
        preferredPersonIds: [],
      })) as unknown as Record<string, unknown>[],
      default_venue_info: data.defaultVenueInfo,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/templates/${id}`)
}
