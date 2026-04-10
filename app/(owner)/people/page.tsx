import { createClient } from '@/lib/supabase/server'
import { personMapper } from '@/lib/supabase/mappers'
import { PersonList } from './person-list'

export default async function PeoplePage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('persons')
    .select('*')
    .eq('role', 'freelancer')
    .order('name')

  const persons = (rows ?? []).map(personMapper.fromDb)

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Crew</h1>
      <PersonList persons={persons} />
    </div>
  )
}
