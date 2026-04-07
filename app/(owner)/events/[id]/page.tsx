import { createClient } from '@/lib/supabase/server'
import { eventMapper, roleMapper, bookingMapper, personMapper, templateMapper } from '@/lib/supabase/mappers'
import { BookingSection } from './booking-section'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DeleteEventButton } from './delete-button'
import type { EventStatus, ConcretePhase } from '@/lib/types'

function statusLabel(status: EventStatus): string {
  const labels: Record<EventStatus, string> = {
    draft: 'Entwurf', booking: 'Buchung', confirmed: 'Bestätigt',
    live: 'Live', completed: 'Abgeschlossen', cancelled: 'Abgesagt',
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

  // Event, Rollen, Personen parallel laden
  const [
    { data: eventRow },
    { data: roleRows },
    { data: personRows },
  ] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('roles').select('*').eq('event_id', id).order('created_at'),
    supabase.from('persons').select('*').eq('role', 'freelancer'),
  ])

  if (!eventRow) notFound()

  const event = eventMapper.fromDb(eventRow)
  const roles = (roleRows ?? []).map(roleMapper.fromDb)
  const persons = (personRows ?? []).map(personMapper.fromDb)

  // Bookings für alle Rollen laden
  const roleIds = roles.map(r => r.id)
  const { data: bookingRows } = roleIds.length > 0
    ? await supabase.from('bookings').select('*').in('role_id', roleIds)
    : { data: [] }
  const bookings = (bookingRows ?? []).map(bookingMapper.fromDb)

  // Template laden (für bevorzugte Personen im Picker)
  const { data: templateRow } = event.templateId
    ? await supabase.from('production_templates').select('*').eq('id', event.templateId).single()
    : { data: null }
  const template = templateRow ? templateMapper.fromDb(templateRow) : null

  // busyPersonIds: Personen mit confirmed Booking an gleichem Kalendertag
  const eventDay = event.phases[0]?.startTime.slice(0, 10) ?? ''
  let busyPersonIds: string[] = []

  if (eventDay) {
    const { data: confirmedBookingRows } = await supabase
      .from('bookings')
      .select('person_id, roles!inner(event_id)')
      .eq('status', 'confirmed')

    const otherEventIds = [
      ...new Set(
        (confirmedBookingRows ?? [])
          .map(b => (b as any).roles.event_id as string)
          .filter((eid: string) => eid !== id),
      ),
    ]

    if (otherEventIds.length > 0) {
      const { data: otherEventRows } = await supabase
        .from('events')
        .select('id, phases')
        .in('id', otherEventIds)

      const busyEventIds = new Set(
        (otherEventRows ?? [])
          .filter(e => {
            const phases = e.phases as unknown as ConcretePhase[]
            return phases[0]?.startTime.slice(0, 10) === eventDay
          })
          .map(e => e.id),
      )

      busyPersonIds = (confirmedBookingRows ?? [])
        .filter(b => busyEventIds.has((b as any).roles.event_id))
        .map(b => b.person_id)
    }
  }

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
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {event.title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass(event.status)}`}
          >
            {statusLabel(event.status)}
          </span>
          {event.status === 'draft' && <DeleteEventButton eventId={event.id} />}
        </div>
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
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                })}
                {' – '}
                {new Date(phase.endTime).toLocaleString('de-CH', {
                  hour: '2-digit', minute: '2-digit',
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

      {/* Rollen + Booking */}
      <section className="space-y-3">
        <h2 className="label-control text-muted-foreground">
          Rollen ({roles.length})
        </h2>
        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Rollen vorhanden.</p>
        ) : (
          <BookingSection
            event={event}
            roles={roles}
            initialBookings={bookings}
            persons={persons}
            busyPersonIds={busyPersonIds}
            templateRoleTemplates={template?.roleTemplates ?? []}
          />
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
