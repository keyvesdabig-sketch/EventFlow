'use client'

import { useState } from 'react'
import { cancelEventAction } from './actions'

export function CancelEventButton({ eventId }: { eventId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    setLoading(true)
    setError(null)
    const result = await cancelEventAction(eventId)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      setConfirming(false)
    }
    // Bei Erfolg: revalidatePath aktualisiert die Seite automatisch
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs label-control text-muted-foreground hover:text-tally-red transition-colors px-3 py-1.5 ghost-border rounded"
      >
        Event absagen
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-tally-red">{error}</span>}
      <span className="text-xs text-muted-foreground">Wirklich absagen?</span>
      <button
        onClick={handleCancel}
        disabled={loading}
        className="text-xs label-control text-tally-red hover:text-tally-red/80 transition-colors px-3 py-1.5 border border-tally-red/30 rounded bg-tally-red/10"
      >
        {loading ? 'Absagen...' : 'Ja, absagen'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Abbrechen
      </button>
    </div>
  )
}
