import type { SupabaseClient } from '@supabase/supabase-js'

export async function linkPersonToUser(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<'linked' | 'already_linked' | 'no_person'> {
  const { data: person } = await supabase
    .from('persons')
    .select('id, user_id')
    .eq('email', email)
    .single()

  if (!person) return 'no_person'
  if (person.user_id) return 'already_linked'

  await supabase
    .from('persons')
    .update({ user_id: userId })
    .eq('id', person.id)

  return 'linked'
}
