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
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null)
  const [skillFilter, setSkillFilter] = useState<Skill[]>([])
  const [replaceRoleId, setReplaceRoleId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const hasAnyBookings = bookings.length > 0

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
  }, [event.id])

  // Auto-Transition zu confirmed wenn alle Rollen bestätigt
  useEffect(() => {
    if (event.status === 'booking' && checkAllRolesConfirmed(roles, bookings)) {
      router.refresh()
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
      setServerError(null)
      const result = await startBookingAction(event.id)
      if (result?.error) { setServerError(result.error); return }
      router.refresh()
    })
  }

  function handleSendRequests() {
    const assignmentList = Object.entries(assignments).map(([roleId, personId]) => ({ roleId, personId }))
    startTransition(async () => {
      setServerError(null)
      const result = await sendBookingRequests(event.id, assignmentList)
      if (result?.error) { setServerError(result.error); return }
      setAssignments({})
      router.refresh()
    })
  }

  function handleReplace(roleId: string, personId: string) {
    startTransition(async () => {
      setServerError(null)
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
  if (!hasAnyBookings) {
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
    p.id !== role.assignedPersonId &&
    (skillFilter.length === 0 || skillFilter.every(s => p.skills.includes(s))),
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
