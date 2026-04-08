import { createClient } from '@/lib/supabase/server'
import { eventMapper } from '@/lib/supabase/mappers'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function CallSheetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Eigene Person-ID
  const { data: personRow } = await supabase
    .from('persons')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!personRow) notFound()

  // Event laden (RLS erlaubt Zugriff nur wenn Buchung vorhanden)
  const { data: eventRow } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()
  if (!eventRow) notFound()

  const event = eventMapper.fromDb(eventRow)

  // Eigene bestätigte Rolle für dieses Event
  const { data: myBookingRow } = await supabase
    .from('bookings')
    .select('*, roles!inner(title, event_id)')
    .eq('person_id', personRow.id)
    .eq('status', 'confirmed')
    .eq('roles.event_id', id)
    .single()

  if (!myBookingRow) notFound() // kein Zugriff wenn nicht bestätigt

  const myRoleTitle = (myBookingRow as any).roles.title as string

  // Crew via SECURITY DEFINER Funktion laden
  const { data: crewRows } = await supabase
    .rpc('get_confirmed_crew', { p_event_id: id })

  type CrewMember = { person_id: string; person_name: string; phone: string | null; role_title: string }
  const crew: CrewMember[] = (crewRows ?? []) as CrewMember[]

  const firstPhase = event.phases[0]

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('de-CH', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })

  const mapsUrl = event.venue.gpsLat && event.venue.gpsLng
    ? `https://maps.google.com/?q=${event.venue.gpsLat},${event.venue.gpsLng}`
    : `https://maps.google.com/?q=${encodeURIComponent(event.venue.address)}`

  const navUrl = event.venue.gpsLat && event.venue.gpsLng
    ? `https://maps.google.com/maps?daddr=${event.venue.gpsLat},${event.venue.gpsLng}`
    : `https://maps.google.com/maps?daddr=${encodeURIComponent(event.venue.address)}`

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/home"
          className="label-control text-muted-foreground hover:text-foreground transition-colors text-xs"
        >
          ← Home
        </Link>
        <div className="mt-2 border-l-4 border-tally-red pl-3">
          <p className="label-control text-tally-red text-xs mb-1">
            BESTÄTIGT
          </p>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {event.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {firstPhase ? formatDate(firstPhase.startTime) : '—'}
            {' · Deine Rolle: '}
            <span className="text-signal-green">{myRoleTitle}</span>
          </p>
        </div>
      </div>

      {/* Zeitplan */}
      <section className="space-y-3">
        <h2 className="label-control text-muted-foreground">Zeitplan</h2>
        <div className="space-y-1">
          {event.phases.map((phase, i) => {
            const isLive = phase.name.toLowerCase().includes('live') ||
              phase.name.toLowerCase().includes('sendebeginn')
            return (
              <div
                key={i}
                className={`flex items-center gap-4 ghost-border rounded-lg bg-level-1 px-5 py-3 ${isLive ? 'border-tally-red/40' : ''}`}
              >
                <span className={`data-technical text-sm font-bold w-12 ${isLive ? 'text-tally-red' : 'text-pending-amber'}`}>
                  {formatTime(phase.startTime)}
                </span>
                <span className={`font-medium ${isLive ? 'text-tally-red' : 'text-foreground'}`}>
                  {phase.name}
                </span>
                <span className="data-technical text-xs text-muted-foreground ml-auto">
                  bis {formatTime(phase.endTime)}
                </span>
              </div>
            )
          })}
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
          <div className="flex gap-4 pt-1">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-pending-amber hover:text-pending-amber/80 transition-colors"
            >
              ↗ Karte öffnen
            </a>
            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-pending-amber hover:text-pending-amber/80 transition-colors"
            >
              ↗ Navigation starten
            </a>
          </div>
        </div>
      </section>

      {/* Crew */}
      <section className="space-y-3">
        <h2 className="label-control text-muted-foreground">Crew</h2>
        <div className="ghost-border rounded-lg bg-level-1 divide-y divide-ghost-border">
          {crew.map((member) => {
            const isMe = member.person_id === personRow.id
            return (
              <div
                key={String(member.person_id)}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <span className="label-control text-xs text-muted-foreground mr-3">
                    {member.role_title}
                  </span>
                  <span className={`text-sm font-medium ${isMe ? 'text-signal-green' : 'text-foreground'}`}>
                    {isMe ? `${member.person_name} (du)` : member.person_name}
                  </span>
                </div>
                {!isMe && member.phone && (
                  <a
                    href={`tel:${member.phone}`}
                    className="text-pending-amber hover:text-pending-amber/80 transition-colors ml-4"
                    aria-label={`${member.person_name} anrufen`}
                  >
                    📞
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Notizen */}
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
