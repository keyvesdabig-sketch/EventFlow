import { createClient } from '@/lib/supabase/server'
import { eventMapper } from '@/lib/supabase/mappers'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Event, EventStatus } from '@/lib/types'

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
    cancelled: 'text-muted-foreground ghost-border opacity-40 line-through',
  }
  return classes[status]
}

function firstPhaseDate(event: Event): string {
  if (!event.phases.length) return '—'
  const d = new Date(event.phases[0].startTime)
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('events')
    .select('*')

  const events = (rows ?? [])
    .map(eventMapper.fromDb)
    .sort((a, b) => {
      const aDate = a.phases[0]?.startTime ?? ''
      const bDate = b.phases[0]?.startTime ?? ''
      return aDate.localeCompare(bDate)
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-control text-muted-foreground mb-1">Übersicht</p>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ letterSpacing: '-0.02em' }}
          >
            Dashboard
          </h1>
        </div>
        <Button asChild>
          <Link href="/events/new">+ Neues Event</Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="border border-white/5 rounded-xl bg-background/30 backdrop-blur-md p-12 text-center shadow-inner animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite] hover:animate-none transition-all duration-500">
          <p className="text-muted-foreground text-sm font-medium">Noch keine Events.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Erstelle ein Event aus einem Template.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(event => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="flex items-center justify-between border border-white/5 rounded-xl bg-background/40 backdrop-blur-md px-5 py-4 hover:bg-background/60 hover:shadow-lg transition-all duration-300 group shadow-sm"
            >
              <div className="space-y-0.5">
                <p className="font-medium text-foreground group-hover:text-foreground">
                  {event.title}
                </p>
                <p className="data-technical text-xs text-muted-foreground">
                  {firstPhaseDate(event)}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass(event.status)}`}
              >
                {statusLabel(event.status)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
