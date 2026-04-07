'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { deleteEventAction } from './actions'

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!confirm('Event wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return
    startTransition(async () => {
      const result = await deleteEventAction(eventId)
      if (result?.error) {
        alert(result.error)
      } else {
        router.push('/dashboard')
      }
    })
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
      {isPending ? 'Wird gelöscht…' : 'Event löschen'}
    </Button>
  )
}
