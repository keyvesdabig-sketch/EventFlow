import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { bookingMapper, roleMapper, eventMapper } from '@/lib/supabase/mappers'
import { BookingRequests } from './booking-requests'

export default async function FreelancerHomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: personRow } = await supabase
    .from('persons')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!personRow) return null

  const personId = personRow.id

  // Offene Anfragen (status='sent')
  const { data: pendingBookingRows } = await supabase
    .from('bookings')
    .select('*, roles!inner(*, events!inner(*))')
    .eq('person_id', personId)
    .eq('status', 'sent')
    .order('requested_at', { ascending: false })

  const pendingRequests = (pendingBookingRows ?? []).map(row => ({
    booking: bookingMapper.fromDb(row),
    role: roleMapper.fromDb((row as any).roles),
    event: eventMapper.fromDb((row as any).roles.events),
  }))

  // Bestätigte Events (status='confirmed')
  const { data: confirmedBookingRows } = await supabase
    .from('bookings')
    .select('*, roles!inner(*, events!inner(*))')
    .eq('person_id', personId)
    .eq('status', 'confirmed')
    .order('requested_at', { ascending: false })

  const confirmedBookings = (confirmedBookingRows ?? [])
    .map(row => ({
      booking: bookingMapper.fromDb(row),
      role: roleMapper.fromDb((row as any).roles),
      event: eventMapper.fromDb((row as any).roles.events),
    }))
    .sort((a, b) => {
      const aDate = a.event.phases[0]?.startTime ?? ''
      const bDate = b.event.phases[0]?.startTime ?? ''
      return aDate.localeCompare(bDate)
    })

  return (
    <div className="space-y-8">
      {/* Offene Anfragen */}
      <section className="space-y-3">
        <div>
          <p className="label-control text-muted-foreground mb-1">Neu</p>
          <h1 className="text-xl font-bold text-foreground" style={{ letterSpacing: '-0.02em' }}>
            Offene Anfragen
            {pendingRequests.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-pending-amber/20 text-pending-amber text-xs px-2 py-0.5">
                {pendingRequests.length}
              </span>
            )}
          </h1>
        </div>
        <BookingRequests requests={pendingRequests} />
      </section>

      {/* Bestätigte Events */}
      <section className="space-y-3">
        <div>
          <p className="label-control text-muted-foreground mb-1">Bestätigt</p>
          <h2 className="text-xl font-bold text-foreground" style={{ letterSpacing: '-0.02em' }}>
            Meine Events
          </h2>
        </div>
        {confirmedBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine bestätigten Einsätze.</p>
        ) : (
          <div className="space-y-2">
            {confirmedBookings.map(({ booking, role, event }) => {
              const firstPhase = event.phases[0]
              return (
                <Link
                  key={booking.id}
                  href={`/call-sheet/${event.id}`}
                  className="ghost-border rounded-lg bg-level-1 px-5 py-4 space-y-1 block hover:bg-level-2 transition-colors"
                >
                  <p className="font-medium text-foreground">{event.title}</p>
                  <p className="data-technical text-xs text-muted-foreground">
                    {firstPhase
                      ? new Date(firstPhase.startTime).toLocaleDateString('de-CH', {
                          weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
                        })
                      : '—'}
                    {' · '}
                    {role.title}
                  </p>
                  {event.venue.name && (
                    <p className="text-xs text-muted-foreground">{event.venue.name}</p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
