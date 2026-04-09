import { createClient } from '@/lib/supabase/server'
import { eventMapper, roleMapper, bookingMapper, personMapper, templateMapper } from '@/lib/supabase/mappers'
import { BookingSection } from './booking-section'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DeleteEventButton } from './delete-button'
import { CancelEventButton } from './cancel-button'
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
          {event.status !== 'cancelled' && event.status !== 'completed' && (
            <CancelEventButton eventId={event.id} />
          )}
          {event.status === 'draft' && <DeleteEventButton eventId={event.id} />}
        </div>
      </div>

      {/* Phases */}
      <section className="space-y-4">
        <h2 className="label-control text-muted-foreground/60 tracking-widest pl-1 uppercase">Zeitplan</h2>
        <div className="flex flex-col">
          {event.phases.map((phase, i) => (
            <div key={i} className="flex group">
              {/* Timeline Column */}
              <div className="flex flex-col items-center w-8 sm:w-12 shrink-0">
                <div className={`w-px flex-1 ${i === 0 ? 'bg-transparent' : 'bg-white/15'}`} />
                <div className="w-2.5 h-2.5 rounded-full border-[1.5px] border-white/40 bg-background group-hover:border-white group-hover:shadow-[0_0_12px_rgba(255,255,255,0.7)] group-hover:scale-110 transition-all z-10 my-1.5" />
                <div className={`w-px flex-1 ${i === event.phases.length - 1 ? 'bg-transparent' : 'bg-white/15'}`} />
              </div>

              {/* Card Column */}
              <div className="flex-1 py-2 sm:py-3 min-w-0">
                <div
                  className="flex flex-col lg:flex-row lg:items-center justify-between rounded-xl border border-white/5 bg-background/40 backdrop-blur-xl px-4 sm:px-5 py-3.5 shadow-lg relative overflow-hidden group-hover:border-white/10 transition-colors"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <span className="font-semibold text-foreground/90 tracking-wide relative z-10 mb-2 lg:mb-0 truncate">{phase.name}</span>
                  <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-4 items-center text-sm font-medium tracking-wider relative z-10">
                    <span className="text-muted-foreground/60 whitespace-nowrap">
                      {new Date(phase.startTime).toLocaleString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    </span>
                    <span className="text-foreground/80 bg-white/5 px-2.5 py-1 rounded-md border border-white/5 whitespace-nowrap">
                      {new Date(phase.startTime).toLocaleString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                      <span className="text-muted-foreground/50 mx-1.5">–</span>
                      {new Date(phase.endTime).toLocaleString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Venue */}
      <section className="space-y-4">
        <h2 className="label-control text-muted-foreground/60 tracking-widest pl-1 uppercase">Venue</h2>
        <div className="rounded-xl border border-white/5 bg-background/40 backdrop-blur-xl px-5 py-4 space-y-2 shadow-lg">
          <p className="font-semibold text-foreground/90 tracking-wide">{event.venue.name || '—'}</p>
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
      <section className="space-y-4">
        <h2 className="label-control text-muted-foreground/60 tracking-widest pl-1 uppercase">
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
        <section className="space-y-4">
          <h2 className="label-control text-muted-foreground/60 tracking-widest pl-1 uppercase">Notizen</h2>
          <div className="rounded-xl border border-white/5 bg-background/40 backdrop-blur-xl px-5 py-4 text-sm text-muted-foreground/90 whitespace-pre-wrap shadow-lg">
            {event.notes}
          </div>
        </section>
      )}
    </div>
  )
}
