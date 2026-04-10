'use client'

import type { Person } from '@/lib/types'

export function PersonList({ persons }: { persons: Person[] }) {
  return <div className="text-sm text-muted-foreground">{persons.length} Freelancer</div>
}
