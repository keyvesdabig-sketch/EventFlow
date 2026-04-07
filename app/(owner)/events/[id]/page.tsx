import { createClient } from '@/lib/supabase/server'
import { eventMapper, roleMapper } from '@/lib/supabase/mappers'
import { ProductionChip } from '@/components/ui/production-chip'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { EventStatus } from '@/lib/types'

function statusLabel(status: EventStatus): string {
  const labels: Record<EventStatus, string> = {
    draft: 'Entwurf',
    booking: 'Buchung',
    confirmed: 'Bestätigt',
    live: 'Live',
    completed: 'Abgeschlossen',
    cancelled: 'Abgesagt',
  }
  return labels[status]
}

function statusClass(status: EventStatus): string {
  const classes: Record<EventStatus, string> = {
    draft: 'text-muted-foreground ghost-border',
    booking: 'text-pending-amber border-pending-amber/30 bg-pending-amber/10',
    confirmed: 'text-signal-green border-signal-green/30 bg-signal-green/10',
    live: 'text-tally-red border-tally-red/30 bg-tally-red/10',
    completed: 'text-muted-foreground ghost-border opacity-60',
    cancelled: 'text-muted-foreground ghost-border opacity-40',
  }
  return classes[status]
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: eventRow }, { data: roleRows }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('roles').select('*').eq('event_id', id).order('created_at'),
  ])

  if (!eventRow) notFound()

  const event = eventMapper.fromDb(eventRow)
  const roles = (roleRows ?? []).map(roleMapper.fromDb)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="label-control text-muted-foreground hover:text-foreground transition-colors text-xs"
          >
            ← Dashboard
          </Link>
          <h1
            className="text-2xl font-bold text-foreground tracking-tight"
          >
            {event.title}
          </h1>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass(event.status)}`}
        >
          {statusLabel(event.status)}
        </span>
      </div>

      {/* Phases */}
      <section className="space-y-3">
        <h2 className="label-control text-muted-foreground">Zeitplan</h2>
        <div className="space-y-2">
          {event.phases.map((phase, i) => (
            <div
              key={i}
              className="flex items-center justify-between ghost-border rounded-lg bg-level-1 px-5 py-3"
            >
              <span className="font-medium text-foreground">{phase.name}</span>
              <span className="data-technical text-sm text-muted-foreground">
                {new Date(phase.startTime).toLocaleString('de-CH', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' – '}
                {new Date(phase.endTime).toLocaleString('de-CH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Venue */}
      <section className="space-y-3">
        <h2 className="label-control text-muted-foreground">Venue</h2>
        <div className="ghost-border rounded-lg bg-level-1 px-5 py-4 space-y-2">
          <p className="font-medium text-foreground">{event.venue.name || '—'}</p>
          {event.venue.address && (
            <p className="text-sm text-muted-foreground">{event.venue.address}</p>
          )}
          {event.venue.parkingInfo && (
            <p className="text-sm text-muted-foreground">
              <span className="label-control text-xs mr-2">Parkplatz</span>
              {event.venue.parkingInfo}
            </p>
          )}
          {event.venue.accessInfo && (
            <p className="text-sm text-muted-foreground">
              <span className="label-control text-xs mr-2">Zufahrt</span>
              {event.venue.accessInfo}
            </p>
          )}
        </div>
      </section>

      {/* Roles */}
      <section className="space-y-3">
        <h2 className="label-control text-muted-foreground">
          Rollen ({roles.length})
        </h2>
        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Rollen vorhanden.</p>
        ) : (
          <div className="space-y-2">
            {roles.map(role => (
              <div
                key={role.id}
                className="flex items-center justify-between ghost-border rounded-lg bg-level-1 px-5 py-3"
              >
                <ProductionChip>{role.title}</ProductionChip>
                <span className="data-technical text-xs text-muted-foreground">
                  offen
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notes */}
      {event.notes && (
        <section className="space-y-3">
          <h2 className="label-control text-muted-foreground">Notizen</h2>
          <div className="ghost-border rounded-lg bg-level-1 px-5 py-4 text-sm text-muted-foreground whitespace-pre-wrap">
            {event.notes}
          </div>
        </section>
      )}
    </div>
  )
}
