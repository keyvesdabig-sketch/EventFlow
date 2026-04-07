import { createClient } from '@/lib/supabase/server'
import { templateMapper } from '@/lib/supabase/mappers'
import { Button } from '@/components/ui/button'
import { ProductionChip } from '@/components/ui/production-chip'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('production_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (!row) notFound()
  const template = templateMapper.fromDb(row)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-control text-muted-foreground mb-1">Template</p>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ letterSpacing: '-0.02em' }}
          >
            {template.name}
          </h1>
        </div>
        <Button asChild>
          <Link href={`/events/new?templateId=${template.id}`}>Event erstellen</Link>
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="label-control text-muted-foreground">Phasen</h2>
        <div className="space-y-2">
          {template.phases.map((phase, i) => (
            <div
              key={i}
              className="flex items-center justify-between ghost-border rounded-lg bg-level-1 px-5 py-3"
            >
              <span className="font-medium text-foreground">{phase.name}</span>
              <span className="data-technical text-sm text-muted-foreground">
                {phase.defaultDurationHours} h
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="label-control text-muted-foreground">Rollen</h2>
        <div className="space-y-2">
          {template.roleTemplates.map((rt, i) => (
            <div
              key={i}
              className="flex items-center justify-between ghost-border rounded-lg bg-level-1 px-5 py-3"
            >
              <div className="flex items-center gap-3">
                <ProductionChip label={rt.title} />
                {rt.count > 1 && (
                  <span className="data-technical text-xs text-muted-foreground">
                    × {rt.count}
                  </span>
                )}
              </div>
              <span className="data-technical text-xs text-muted-foreground">
                {rt.preferredPersonIds.length} bevorzugt
              </span>
            </div>
          ))}
        </div>
      </section>

      {template.defaultVenueInfo && (
        <section className="space-y-3">
          <h2 className="label-control text-muted-foreground">Standard-Venue-Info</h2>
          <div className="ghost-border rounded-lg bg-level-1 px-5 py-4 text-sm text-muted-foreground whitespace-pre-wrap">
            {template.defaultVenueInfo}
          </div>
        </section>
      )}
    </div>
  )
}
