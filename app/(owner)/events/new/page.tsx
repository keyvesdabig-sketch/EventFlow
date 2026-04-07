import { createClient } from '@/lib/supabase/server'
import { templateMapper } from '@/lib/supabase/mappers'
import { EventWizard } from './wizard'

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string }>
}) {
  const { templateId } = await searchParams
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('production_templates')
    .select('*')
    .order('name')

  const templates = (rows ?? []).map(templateMapper.fromDb)

  return (
    <div className="space-y-6">
      <div>
        <p className="label-control text-muted-foreground mb-1">Neues Event</p>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ letterSpacing: '-0.02em' }}
        >
          Event erstellen
        </h1>
      </div>
      <EventWizard templates={templates} initialTemplateId={templateId} />
    </div>
  )
}
