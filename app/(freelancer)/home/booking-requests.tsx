'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { respondToBookingAction } from '../actions'
import { Button } from '@/components/ui/button'
import type { Booking, Role, Event } from '@/lib/types'

interface BookingRequest {
  booking: Booking
  role: Role
  event: Event
}

export function BookingRequests({ requests }: { requests: BookingRequest[] }) {
  const router = useRouter()

  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Keine offenen Anfragen.</p>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map(({ booking, role, event }) => (
        <RequestCard
          key={booking.id}
          booking={booking}
          role={role}
          event={event}
          onResponded={() => router.refresh()}
        />
      ))}
    </div>
  )
}

function RequestCard({
  booking, role, event, onResponded,
}: {
  booking: Booking
  role: Role
  event: Event
  onResponded: () => void
}) {
  const [showDeclineInput, setShowDeclineInput] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAccept() {
    startTransition(async () => {
      const result = await respondToBookingAction(booking.id, 'confirmed')
      if (result?.error) { setError(result.error); return }
      onResponded()
    })
  }

  function handleDecline() {
    startTransition(async () => {
      const result = await respondToBookingAction(booking.id, 'declined', declineReason || undefined)
      if (result?.error) { setError(result.error); return }
      onResponded()
    })
  }

  const firstPhase = event.phases[0]
  const lastPhase = event.phases[event.phases.length - 1]

  return (
    <div className="ghost-border rounded-lg bg-level-1 px-5 py-4 space-y-4">
      <div className="space-y-1">
        <p className="font-medium text-foreground">{event.title}</p>
        <p className="data-technical text-xs text-muted-foreground">
          {firstPhase
            ? new Date(firstPhase.startTime).toLocaleDateString('de-CH', {
                weekday: 'short', day: '2-digit', month: '2-digit',
              })
            : '—'}
          {' · '}
          {role.title}
        </p>
        {firstPhase && lastPhase && (
          <p className="data-technical text-xs text-muted-foreground">
            {new Date(firstPhase.startTime).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
            {' – '}
            {new Date(lastPhase.endTime).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        {event.venue.name && (
          <p className="text-xs text-muted-foreground">{event.venue.name}</p>
        )}
      </div>

      {error && <p className="text-xs text-tally-red">{error}</p>}

      {!showDeclineInput ? (
        <div className="flex gap-3">
          <Button
            onClick={handleAccept}
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? '…' : 'Zusagen'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeclineInput(true)}
            disabled={isPending}
            className="flex-1"
          >
            Ablehnen
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={declineReason}
            onChange={e => setDeclineReason(e.target.value)}
            placeholder="Grund (optional)"
            className="w-full rounded-lg ghost-border bg-level-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? '…' : 'Ablehnen bestätigen'}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowDeclineInput(false); setDeclineReason('') }}
              disabled={isPending}
              className="flex-1"
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
