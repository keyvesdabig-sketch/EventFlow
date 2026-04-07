# Plan 3: Booking Flow + Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owner kann Rollen mit Freelancern besetzen und Buchungsanfragen senden; Freelancer sieht Anfragen, kann zusagen/absagen; Owner sieht Live-Status via Supabase Realtime.

**Architecture:** Inline-Booking-UI im Event-Detail (Client Component `booking-section.tsx`) mit Supabase Realtime-Subscription auf der `bookings`-Tabelle. Freelancer-Seite (`/home`) lädt Anfragen und bestätigte Events als Server Component. Shared pure helpers in `lib/bookings.ts`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (Postgres + Realtime), Tailwind CSS, shadcn/ui, Vitest

---

## File Map

| Datei | Neu/Änderung | Verantwortlichkeit |
|-------|-------------|-------------------|
| `lib/bookings.ts` | Neu | Pure helpers: Status-Ableitung, Konfliktcheck, `transitionEventStatus` |
| `tests/unit/bookings.test.ts` | Neu | Unit tests für `lib/bookings.ts` |
| `app/(owner)/events/[id]/actions.ts` | Neu | Server Actions: `startBookingAction`, `sendBookingRequests`, `replaceBookingAction` |
| `app/(owner)/events/[id]/booking-section.tsx` | Neu | Client Component: Role-Picker, Realtime, Status-Anzeige |
| `app/(owner)/events/[id]/page.tsx` | Änderung | Persons + Bookings laden, `BookingSection` einbinden |
| `app/(freelancer)/actions.ts` | Neu | Server Action: `respondToBookingAction` |
| `app/(freelancer)/home/booking-requests.tsx` | Neu | Client Component: Anfragen beantworten (inline Ablehnungsgrund) |
| `app/(freelancer)/home/page.tsx` | Änderung | Stub ersetzen: Anfragen + bestätigte Events laden |

---

## Task 1: `lib/bookings.ts` — Pure Helpers

**Files:**
- Create: `lib/bookings.ts`
- Test: `tests/unit/bookings.test.ts`

- [ ] **Step 1: Failing tests schreiben**

Erstelle `tests/unit/bookings.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  getRoleBookingStatus,
  checkAllRolesConfirmed,
} from '@/lib/bookings'
import type { Booking, Role } from '@/lib/types'

function makeBooking(overrides: Partial<Booking> & { roleId: string; status: Booking['status'] }): Booking {
  return {
    id: 'b1', personId: 'p1', requestedAt: '2026-04-07T10:00:00Z',
    respondedAt: null, declineReason: null, createdAt: '2026-04-07T10:00:00Z',
    ...overrides,
  }
}

function makeRole(id: string): Role {
  return { id, eventId: 'e1', title: 'EVS-Operator', assignedPersonId: null, createdAt: '2026-04-07T10:00:00Z' }
}

describe('getRoleBookingStatus', () => {
  it('gibt open zurück wenn keine Bookings vorhanden', () => {
    expect(getRoleBookingStatus([], 'r1')).toBe('open')
  })

  it('gibt open zurück wenn alle Bookings einer anderen Rolle gehören', () => {
    const bookings = [makeBooking({ roleId: 'r2', status: 'sent' })]
    expect(getRoleBookingStatus(bookings, 'r1')).toBe('open')
  })

  it('gibt requested zurück bei status sent', () => {
    const bookings = [makeBooking({ roleId: 'r1', status: 'sent' })]
    expect(getRoleBookingStatus(bookings, 'r1')).toBe('requested')
  })

  it('gibt confirmed zurück bei status confirmed', () => {
    const bookings = [makeBooking({ roleId: 'r1', status: 'confirmed' })]
    expect(getRoleBookingStatus(bookings, 'r1')).toBe('confirmed')
  })

  it('gibt declined zurück wenn neuestes Booking declined ist', () => {
    const bookings = [makeBooking({ id: 'b1', roleId: 'r1', status: 'declined', requestedAt: '2026-04-07T10:00:00Z' })]
    expect(getRoleBookingStatus(bookings, 'r1')).toBe('declined')
  })

  it('gibt requested zurück wenn neues Booking sent ist nach declined', () => {
    const bookings = [
      makeBooking({ id: 'b1', roleId: 'r1', status: 'declined', requestedAt: '2026-04-07T09:00:00Z' }),
      makeBooking({ id: 'b2', roleId: 'r1', status: 'sent',    requestedAt: '2026-04-07T10:00:00Z' }),
    ]
    expect(getRoleBookingStatus(bookings, 'r1')).toBe('requested')
  })
})

describe('checkAllRolesConfirmed', () => {
  it('gibt false zurück wenn eine Rolle open ist', () => {
    const roles = [makeRole('r1'), makeRole('r2')]
    const bookings = [makeBooking({ roleId: 'r1', status: 'confirmed' })]
    expect(checkAllRolesConfirmed(roles, bookings)).toBe(false)
  })

  it('gibt false zurück wenn eine Rolle requested ist', () => {
    const roles = [makeRole('r1'), makeRole('r2')]
    const bookings = [
      makeBooking({ id: 'b1', roleId: 'r1', status: 'confirmed' }),
      makeBooking({ id: 'b2', roleId: 'r2', status: 'sent' }),
    ]
    expect(checkAllRolesConfirmed(roles, bookings)).toBe(false)
  })

  it('gibt true zurück wenn alle Rollen confirmed sind', () => {
    const roles = [makeRole('r1'), makeRole('r2')]
    const bookings = [
      makeBooking({ id: 'b1', roleId: 'r1', status: 'confirmed' }),
      makeBooking({ id: 'b2', roleId: 'r2', status: 'confirmed' }),
    ]
    expect(checkAllRolesConfirmed(roles, bookings)).toBe(true)
  })

  it('gibt false zurück bei leerer Rollen-Liste', () => {
    expect(checkAllRolesConfirmed([], [])).toBe(false)
  })
})
```

- [ ] **Step 2: Test fehlschlagen lassen**

```bash
npx vitest run tests/unit/bookings.test.ts
```

Erwartet: FAIL — `Cannot find module '@/lib/bookings'`

- [ ] **Step 3: `lib/bookings.ts` implementieren**

```typescript
import type { Booking, Role, EventStatus } from './types'
import { createClient } from './supabase/server'

export type RoleBookingStatus = 'open' | 'requested' | 'confirmed' | 'declined'

/**
 * Leitet den effektiven Buchungsstatus einer Rolle aus dem neuesten Booking ab.
 * Gibt 'open' wenn keine Bookings vorhanden, 'requested' für status='sent'.
 */
export function getRoleBookingStatus(bookings: Booking[], roleId: string): RoleBookingStatus {
  const roleBookings = bookings
    .filter(b => b.roleId === roleId)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))

  if (roleBookings.length === 0) return 'open'

  const latest = roleBookings[0]
  if (latest.status === 'sent') return 'requested'
  if (latest.status === 'confirmed') return 'confirmed'
  return 'declined'
}

/**
 * Gibt true zurück wenn alle Rollen eines Events confirmed sind.
 * Gibt false bei leerer Rollen-Liste.
 */
export function checkAllRolesConfirmed(roles: Role[], bookings: Booking[]): boolean {
  if (roles.length === 0) return false
  return roles.every(role => getRoleBookingStatus(bookings, role.id) === 'confirmed')
}

/**
 * Setzt den Event-Status in der DB. Shared helper, aufgerufen von Owner- und Freelancer-Actions.
 */
export async function transitionEventStatus(eventId: string, status: EventStatus): Promise<void> {
  const supabase = await createClient()
  await supabase.from('events').update({ status }).eq('id', eventId)
}
```

- [ ] **Step 4: Tests grün laufen**

```bash
npx vitest run tests/unit/bookings.test.ts
```

Erwartet: 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/bookings.ts tests/unit/bookings.test.ts
git commit -m "feat: add booking helpers (getRoleBookingStatus, checkAllRolesConfirmed, transitionEventStatus)"
```

---

## Task 2: Owner Server Actions

**Files:**
- Create: `app/(owner)/events/[id]/actions.ts`

Diese Actions folgen dem gleichen Muster wie `app/(owner)/events/new/actions.ts`: Auth-Check, Owner-Check, DB-Operationen, Fehler zurückgeben als `{ error: string } | void`.

> **Hinweis:** `delete-button.tsx` importiert bereits `deleteEventAction` aus `./actions`. Diese Action muss in der Datei enthalten bleiben — sie ist hier unten als erster Export aufgeführt.

- [ ] **Step 1: `app/(owner)/events/[id]/actions.ts` erstellen**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAllRolesConfirmed, transitionEventStatus } from '@/lib/bookings'
import { bookingMapper, roleMapper } from '@/lib/supabase/mappers'
import { revalidatePath } from 'next/cache'

import { redirect } from 'next/navigation'

/** Bestehende Action — wird von delete-button.tsx verwendet */
export async function deleteEventAction(eventId: string): Promise<{ error: string } | void> {
  const { error, supabase } = await requireOwner()
  if (error || !supabase) return { error: error ?? 'Fehler' }

  const { error: dbError } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (dbError) return { error: dbError.message }
  redirect('/dashboard')
}

async function requireOwner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' as const, supabase: null }
  const { data: person } = await supabase
    .from('persons')
    .select('role')
    .eq('user_id', user.id)
    .single()
  if (person?.role !== 'owner') return { error: 'Keine Berechtigung' as const, supabase: null }
  return { error: null, supabase }
}

/** Setzt Event-Status von draft → booking */
export async function startBookingAction(eventId: string): Promise<{ error: string } | void> {
  const { error, supabase } = await requireOwner()
  if (error || !supabase) return { error: error ?? 'Fehler' }

  const { error: dbError } = await supabase
    .from('events')
    .update({ status: 'booking' })
    .eq('id', eventId)
    .eq('status', 'draft') // nur wenn noch draft

  if (dbError) return { error: dbError.message }
  revalidatePath(`/events/${eventId}`)
}

/**
 * Weist Personen zu Rollen zu und erstellt Booking-Rows mit status='sent'.
 * Setzt roles.assigned_person_id für jede Zuteilung.
 */
export async function sendBookingRequests(
  eventId: string,
  assignments: { roleId: string; personId: string }[],
): Promise<{ error: string } | void> {
  const { error, supabase } = await requireOwner()
  if (error || !supabase) return { error: error ?? 'Fehler' }

  if (assignments.length === 0) return { error: 'Keine Zuteilungen vorhanden' }

  for (const { roleId, personId } of assignments) {
    // Vorherige offene Bookings für diese Rolle schliessen
    await supabase
      .from('bookings')
      .update({ status: 'declined' })
      .eq('role_id', roleId)
      .eq('status', 'sent')

    // assigned_person_id auf Rolle setzen
    const { error: roleError } = await supabase
      .from('roles')
      .update({ assigned_person_id: personId })
      .eq('id', roleId)

    if (roleError) return { error: roleError.message }

    // Neues Booking erstellen
    const { error: bookingError } = await supabase
      .from('bookings')
      .insert({ role_id: roleId, person_id: personId, status: 'sent' })

    if (bookingError) return { error: bookingError.message }
  }

  // Event auf 'booking' setzen falls noch 'draft'
  await supabase
    .from('events')
    .update({ status: 'booking' })
    .eq('id', eventId)
    .eq('status', 'draft')

  revalidatePath(`/events/${eventId}`)
}

/**
 * Ersetzt eine abgesagte Rolle durch eine neue Person.
 * Erstellt ein neues Booking, altes bleibt als Historie.
 */
export async function replaceBookingAction(
  roleId: string,
  newPersonId: string,
): Promise<{ error: string } | void> {
  const { error, supabase } = await requireOwner()
  if (error || !supabase) return { error: error ?? 'Fehler' }

  // assigned_person_id aktualisieren
  const { error: roleError } = await supabase
    .from('roles')
    .update({ assigned_person_id: newPersonId })
    .eq('id', roleId)

  if (roleError) return { error: roleError.message }

  // Neues Booking erstellen
  const { error: bookingError } = await supabase
    .from('bookings')
    .insert({ role_id: roleId, person_id: newPersonId, status: 'sent' })

  if (bookingError) return { error: bookingError.message }

  // Event-ID für revalidatePath über die Rolle holen
  const { data: role } = await supabase
    .from('roles')
    .select('event_id')
    .eq('id', roleId)
    .single()

  if (role) revalidatePath(`/events/${role.event_id}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(owner\)/events/\[id\]/actions.ts
git commit -m "feat: add owner booking server actions (startBooking, sendBookingRequests, replaceBooking)"
```

---

## Task 3: `booking-section.tsx` — Client Component

**Files:**
- Create: `app/(owner)/events/[id]/booking-section.tsx`

Diese Komponente ist der Kern des Booking-Flows. Sie empfängt alle Daten als Props vom Server Component und verwaltet:
1. **Picker-Modus** (noch keine Bookings gesendet): Person-Zuteilung + "Anfragen senden"
2. **Status-Modus** (Bookings vorhanden): Live-Status pro Rolle via Realtime, "Jetzt ersetzen" für declined

**Realtime:** Der Browser-Client (nicht der Server-Client) wird für die Realtime-Subscription verwendet.

- [ ] **Step 1: `booking-section.tsx` erstellen**

```typescript
'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { bookingMapper } from '@/lib/supabase/mappers'
import { getRoleBookingStatus, checkAllRolesConfirmed } from '@/lib/bookings'
import { sendBookingRequests, replaceBookingAction, startBookingAction } from './actions'
import { Button } from '@/components/ui/button'
import { ProductionChip } from '@/components/ui/production-chip'
import type { Role, Booking, Person, Event, RoleTemplate, Skill } from '@/lib/types'

interface BookingSectionProps {
  event: Event
  roles: Role[]
  initialBookings: Booking[]
  persons: Person[]          // alle Freelancer
  busyPersonIds: string[]    // Personen mit confirmed Booking am gleichen Tag
  templateRoleTemplates: RoleTemplate[]
}

const SKILL_LABELS: Record<Skill, string> = {
  camera: 'Kamera', evs: 'EVS', audio: 'Audio',
  vision_mixing: 'Bildmischer', rf_tech: 'RF-Tech',
  replay: 'Replay', graphics: 'Grafik',
}

export function BookingSection({
  event, roles, initialBookings, persons, busyPersonIds, templateRoleTemplates,
}: BookingSectionProps) {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  // roleId → personId (client-seitiger State bis "Anfragen senden")
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  // roleId → ob Inline-Picker offen
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null)
  const [skillFilter, setSkillFilter] = useState<Skill[]>([])
  const [replaceRoleId, setReplaceRoleId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const hasSentBookings = bookings.length > 0

  // Realtime-Subscription für Booking-Updates
  useEffect(() => {
    if (roles.length === 0) return
    const supabase = createClient()
    const roleIds = roles.map(r => r.id)

    const channel = supabase
      .channel(`event-bookings-${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `role_id=in.(${roleIds.join(',')})`,
        },
        payload => {
          setBookings(prev => {
            if (payload.eventType === 'INSERT') {
              return [...prev, bookingMapper.fromDb(payload.new as any)]
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(b =>
                b.id === payload.new.id ? bookingMapper.fromDb(payload.new as any) : b,
              )
            }
            return prev
          })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [event.id, roles])

  // Auto-Transition zu confirmed wenn alle Rollen bestätigt
  useEffect(() => {
    if (event.status === 'booking' && checkAllRolesConfirmed(roles, bookings)) {
      router.refresh() // Server Component neu laden → Status zeigt 'confirmed'
    }
  }, [bookings, roles, event.status, router])

  function getPreferredPersons(role: Role): Person[] {
    const template = templateRoleTemplates.find(rt => rt.title === role.title)
    if (!template) return []
    return template.preferredPersonIds
      .map(id => persons.find(p => p.id === id))
      .filter((p): p is Person => p !== undefined)
      .slice(0, 3)
  }

  function getFilteredPersons(): Person[] {
    return persons.filter(p => {
      if (skillFilter.length === 0) return true
      return skillFilter.every(skill => p.skills.includes(skill))
    })
  }

  function toggleSkillFilter(skill: Skill) {
    setSkillFilter(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill],
    )
  }

  function handleStartBooking() {
    startTransition(async () => {
      const result = await startBookingAction(event.id)
      if (result?.error) { setServerError(result.error); return }
      router.refresh()
    })
  }

  function handleSendRequests() {
    const assignmentList = Object.entries(assignments).map(([roleId, personId]) => ({ roleId, personId }))
    startTransition(async () => {
      const result = await sendBookingRequests(event.id, assignmentList)
      if (result?.error) { setServerError(result.error); return }
      setAssignments({})
      router.refresh()
    })
  }

  function handleReplace(roleId: string, personId: string) {
    startTransition(async () => {
      const result = await replaceBookingAction(roleId, personId)
      if (result?.error) { setServerError(result.error); return }
      setReplaceRoleId(null)
      router.refresh()
    })
  }

  function personStatusClass(personId: string): string {
    if (busyPersonIds.includes(personId)) return 'border-tally-red/50 opacity-60'
    return ''
  }

  // ─── Draft-Status: Booking starten ──────────────────────────────────────────
  if (event.status === 'draft') {
    return (
      <div className="pt-2">
        <Button onClick={handleStartBooking} disabled={isPending}>
          {isPending ? 'Wird gestartet…' : 'Booking starten'}
        </Button>
      </div>
    )
  }

  // ─── Picker-Modus: Rollen zuteilen ──────────────────────────────────────────
  if (!hasSentBookings) {
    const assignmentCount = Object.keys(assignments).length
    return (
      <div className="space-y-3">
        {serverError && (
          <p className="text-sm text-tally-red">{serverError}</p>
        )}
        {roles.map(role => {
          const preferred = getPreferredPersons(role)
          const selected = assignments[role.id]
          const isExpanded = expandedRoleId === role.id
          const filteredPersons = getFilteredPersons()

          return (
            <div key={role.id} className="ghost-border rounded-lg bg-level-1 px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <ProductionChip label={role.title} />
                {selected && (
                  <span className="text-xs text-signal-green">
                    {persons.find(p => p.id === selected)?.name}
                  </span>
                )}
              </div>

              {/* Empfehlungen */}
              {preferred.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {preferred.map(person => (
                    <button
                      key={person.id}
                      onClick={() => setAssignments(prev => ({ ...prev, [role.id]: person.id }))}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                        selected === person.id
                          ? 'border-signal-green/50 bg-signal-green/10 text-signal-green'
                          : `ghost-border hover:bg-level-2 ${personStatusClass(person.id)}`
                      }`}
                    >
                      {person.name}
                      {busyPersonIds.includes(person.id) && (
                        <span className="text-tally-red text-[10px]">●</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Andere wählen */}
              <button
                onClick={() => {
                  setExpandedRoleId(isExpanded ? null : role.id)
                  setSkillFilter([])
                }}
                className="label-control text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Andere wählen {isExpanded ? '▲' : '▼'}
              </button>

              {isExpanded && (
                <div className="space-y-3 pt-1">
                  {/* Skill-Filter */}
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(SKILL_LABELS) as Skill[]).map(skill => (
                      <button
                        key={skill}
                        onClick={() => toggleSkillFilter(skill)}
                        className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                          skillFilter.includes(skill)
                            ? 'border-signal-green/50 bg-signal-green/10 text-signal-green'
                            : 'ghost-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {SKILL_LABELS[skill]}
                      </button>
                    ))}
                  </div>

                  {/* Personenliste */}
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {filteredPersons.map(person => (
                      <button
                        key={person.id}
                        onClick={() => {
                          setAssignments(prev => ({ ...prev, [role.id]: person.id }))
                          setExpandedRoleId(null)
                        }}
                        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                          selected === person.id
                            ? 'bg-signal-green/10 text-signal-green'
                            : 'hover:bg-level-2 text-foreground'
                        } ${personStatusClass(person.id)}`}
                      >
                        <span>{person.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {person.skills.map(s => SKILL_LABELS[s] ?? s).join(', ')}
                          {busyPersonIds.includes(person.id) && (
                            <span className="text-tally-red ml-1">● belegt</span>
                          )}
                        </span>
                      </button>
                    ))}
                    {filteredPersons.length === 0 && (
                      <p className="text-xs text-muted-foreground px-3 py-2">
                        Keine Personen mit diesen Skills
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <Button
          onClick={handleSendRequests}
          disabled={isPending || assignmentCount === 0}
          className="w-full mt-2"
        >
          {isPending
            ? 'Wird gesendet…'
            : assignmentCount > 0
              ? `Anfragen senden (${assignmentCount} Rollen)`
              : 'Anfragen senden'}
        </Button>
      </div>
    )
  }

  // ─── Status-Modus: Live-Status nach dem Senden ───────────────────────────────
  return (
    <div className="space-y-2">
      {serverError && (
        <p className="text-sm text-tally-red">{serverError}</p>
      )}
      {roles.map(role => {
        const status = getRoleBookingStatus(bookings, role.id)
        const assignedPerson = persons.find(p => p.id === role.assignedPersonId)
        const isReplacing = replaceRoleId === role.id

        return (
          <div key={role.id} className="ghost-border rounded-lg bg-level-1 px-5 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ProductionChip label={role.title} />
                <span className="text-sm text-muted-foreground">
                  {assignedPerson?.name ?? '—'}
                </span>
              </div>
              <StatusChip status={status} />
            </div>

            {status === 'declined' && !isReplacing && (
              <button
                onClick={() => setReplaceRoleId(role.id)}
                className="label-control text-xs text-tally-red hover:text-foreground transition-colors"
              >
                Jetzt ersetzen →
              </button>
            )}

            {isReplacing && (
              <ReplaceRolePicker
                role={role}
                persons={persons}
                busyPersonIds={busyPersonIds}
                skillLabels={SKILL_LABELS}
                onCancel={() => setReplaceRoleId(null)}
                onSelect={personId => handleReplace(role.id, personId)}
                isPending={isPending}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function StatusChip({ status }: { status: ReturnType<typeof getRoleBookingStatus> }) {
  const config = {
    open:      { label: 'Offen',      cls: 'text-muted-foreground ghost-border' },
    requested: { label: 'Angefragt',  cls: 'text-pending-amber border-pending-amber/30 bg-pending-amber/10' },
    confirmed: { label: 'Zugesagt',   cls: 'text-signal-green border-signal-green/30 bg-signal-green/10' },
    declined:  { label: 'Abgesagt',   cls: 'text-tally-red border-tally-red/30 bg-tally-red/10' },
  }
  const { label, cls } = config[status]
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}

function ReplaceRolePicker({
  role, persons, busyPersonIds, skillLabels, onCancel, onSelect, isPending,
}: {
  role: Role
  persons: Person[]
  busyPersonIds: string[]
  skillLabels: Record<Skill, string>
  onCancel: () => void
  onSelect: (personId: string) => void
  isPending: boolean
}) {
  const [skillFilter, setSkillFilter] = useState<Skill[]>([])
  const filtered = persons.filter(p =>
    skillFilter.length === 0 || skillFilter.every(s => p.skills.includes(s)),
  )

  return (
    <div className="space-y-2 pt-1">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(skillLabels) as Skill[]).map(skill => (
          <button
            key={skill}
            onClick={() => setSkillFilter(prev =>
              prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill],
            )}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              skillFilter.includes(skill)
                ? 'border-signal-green/50 bg-signal-green/10 text-signal-green'
                : 'ghost-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {skillLabels[skill]}
          </button>
        ))}
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {filtered.map(person => (
          <button
            key={person.id}
            disabled={isPending}
            onClick={() => onSelect(person.id)}
            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-level-2 transition-colors text-foreground"
          >
            <span>{person.name}</span>
            <span className="text-xs text-muted-foreground">
              {person.skills.map(s => skillLabels[s] ?? s).join(', ')}
              {busyPersonIds.includes(person.id) && (
                <span className="text-tally-red ml-1">● belegt</span>
              )}
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={onCancel}
        className="label-control text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Abbrechen
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(owner\)/events/\[id\]/booking-section.tsx
git commit -m "feat: add BookingSection client component with realtime and role picker"
```

---

## Task 4: Owner Event Detail Page updaten

**Files:**
- Modify: `app/(owner)/events/[id]/page.tsx`

Die Server Component muss jetzt laden:
1. Alle Freelancer (für den Person-Picker)
2. Alle Bookings für die Rollen des Events
3. Das Template (für bevorzugte Personen)
4. `busyPersonIds` (Personen mit confirmed Booking am gleichen Tag)

- [ ] **Step 1: `app/(owner)/events/[id]/page.tsx` ersetzen**

```typescript
import { createClient } from '@/lib/supabase/server'
import { eventMapper, roleMapper, bookingMapper, personMapper, templateMapper } from '@/lib/supabase/mappers'
import { ProductionChip } from '@/components/ui/production-chip'
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

  // Event, Rollen, Personen, Bookings parallel laden
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
```

- [ ] **Step 2: Build prüfen**

```bash
npm run build 2>&1 | tail -20
```

Erwartet: kein Fehler. Bei TypeScript-Fehlern: beheben bevor weitermachen.

- [ ] **Step 3: Commit**

```bash
git add app/\(owner\)/events/\[id\]/page.tsx
git commit -m "feat: integrate BookingSection into event detail page with person/booking data"
```

---

## Task 5: Freelancer Server Action

**Files:**
- Create: `app/(freelancer)/actions.ts`

- [ ] **Step 1: `app/(freelancer)/actions.ts` erstellen**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAllRolesConfirmed, transitionEventStatus } from '@/lib/bookings'
import { bookingMapper, roleMapper } from '@/lib/supabase/mappers'
import { revalidatePath } from 'next/cache'

/**
 * Freelancer beantwortet eine Buchungsanfrage.
 * Bei 'confirmed': prüft ob alle Rollen des Events bestätigt → ggf. Event-Status → confirmed
 */
export async function respondToBookingAction(
  bookingId: string,
  response: 'confirmed' | 'declined',
  declineReason?: string,
): Promise<{ error: string } | void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  // Sicherstellen dass das Booking dieser Person gehört
  const { data: bookingRow } = await supabase
    .from('bookings')
    .select('*, persons!bookings_person_id_fkey(user_id)')
    .eq('id', bookingId)
    .single()

  if (!bookingRow) return { error: 'Anfrage nicht gefunden' }
  if ((bookingRow as any).persons?.user_id !== user.id) return { error: 'Keine Berechtigung' }

  // Booking aktualisieren
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: response,
      responded_at: new Date().toISOString(),
      decline_reason: declineReason ?? null,
    })
    .eq('id', bookingId)

  if (updateError) return { error: updateError.message }

  // Bei Zusage: prüfen ob alle Rollen des Events confirmed
  if (response === 'confirmed') {
    const booking = bookingMapper.fromDb(bookingRow)

    const { data: roleRow } = await supabase
      .from('roles')
      .select('event_id')
      .eq('id', booking.roleId)
      .single()

    if (roleRow) {
      const eventId = roleRow.event_id

      const { data: allRoleRows } = await supabase
        .from('roles')
        .select('*')
        .eq('event_id', eventId)

      const { data: allBookingRows } = await supabase
        .from('bookings')
        .select('*')
        .in('role_id', (allRoleRows ?? []).map(r => r.id))

      const allRoles = (allRoleRows ?? []).map(roleMapper.fromDb)
      const allBookings = (allBookingRows ?? []).map(bookingMapper.fromDb)

      if (checkAllRolesConfirmed(allRoles, allBookings)) {
        await transitionEventStatus(eventId, 'confirmed')
      }
    }
  }

  revalidatePath('/home')
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(freelancer\)/actions.ts
git commit -m "feat: add respondToBookingAction for freelancer accept/decline"
```

---

## Task 6: Freelancer Home Page

**Files:**
- Create: `app/(freelancer)/home/booking-requests.tsx`
- Modify: `app/(freelancer)/home/page.tsx`

- [ ] **Step 1: `booking-requests.tsx` erstellen**

```typescript
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
```

- [ ] **Step 2: `app/(freelancer)/home/page.tsx` ersetzen**

```typescript
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
                <div
                  key={booking.id}
                  className="ghost-border rounded-lg bg-level-1 px-5 py-4 space-y-1"
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
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Build prüfen**

```bash
npm run build 2>&1 | tail -20
```

Erwartet: kein Fehler.

- [ ] **Step 4: Alle Tests laufen**

```bash
npm test
```

Erwartet: alle Tests PASS (mind. 29 bestehende + 9 neue aus Task 1 = 38 Tests)

- [ ] **Step 5: Commit**

```bash
git add app/\(freelancer\)/home/page.tsx app/\(freelancer\)/home/booking-requests.tsx
git commit -m "feat: implement freelancer home with pending requests and confirmed events"
```

---

## Task 7: End-to-End Smoke Test

Manueller Test um den kompletten Flow zu verifizieren.

- [ ] **Step 1: Dev-Server starten**

```bash
npm run dev
```

- [ ] **Step 2: Happy Path testen**

1. Als **Owner** einloggen (`/login`, Magic Link)
2. Ein bestehendes Event öffnen (`/events/[id]`)
3. "Booking starten" klicken → Status wechselt zu "Buchung"
4. Empfohlene Person für eine Rolle auswählen (Chip klicken)
5. "Andere wählen ▼" für eine andere Rolle öffnen, Skill-Filter testen, Person wählen
6. "Anfragen senden" klicken → Status-Chips erscheinen ("Angefragt")
7. Als **Freelancer** einloggen (separates Browserfenster oder Inkognito)
8. `/home` zeigt die offene Anfrage
9. "Zusagen" klicken → Anfrage verschwindet, erscheint unter "Meine Events"
10. Zurück zum Owner-Fenster → Rolle zeigt "Zugesagt" (via Realtime, ohne Reload)
11. Wenn alle Rollen bestätigt: Event-Status wechselt zu "Bestätigt"

- [ ] **Step 3: Ablehnen-Flow testen**

1. Freelancer lehnt eine Anfrage ab (mit Ablehnungsgrund)
2. Owner sieht "Abgesagt" auf der Rolle
3. "Jetzt ersetzen →" klicken → Picker öffnet sich
4. Neue Person wählen → Neue Anfrage wird gesendet ("Angefragt")

- [ ] **Step 4: Finaler Commit**

```bash
git add -A
git commit -m "feat: complete Plan 3 - booking flow with realtime status and freelancer responses"
```
