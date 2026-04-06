# Plan 2: Template & Event Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Erste echte Owner-Funktionalität: Events aus Templates erstellen (3-Step Wizard), Event-Liste im Dashboard, Templates browsen, plus Supabase-Infrastruktur (generierte Typen, Mapper, Person-User-Linking beim Login).

**Architecture:** Server Components für alle Read-Views (Supabase Server Client); ein Client Component (Wizard) mit Server Action für Writes. Mapper-Utilities bridgen DB `snake_case` ↔ TypeScript `camelCase`. Role-Materialisierungslogik in reiner Funktion für Testbarkeit.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS), TypeScript, Tailwind CSS, shadcn/ui (Button, Badge, Input), Vitest + React Testing Library

**Spec:** `docs/superpowers/specs/2026-04-06-plan2-template-event-management.md`

---

## File Map

| Datei | Aktion | Zweck |
|-------|--------|-------|
| `lib/supabase/types.ts` | generieren | DB-Typen (snake_case), von Supabase CLI erzeugt |
| `lib/supabase/mappers.ts` | neu | `fromDb()` für alle 5 Tabellen |
| `lib/auth-linking.ts` | neu | Reine Funktion: Person per E-Mail mit User verknüpfen |
| `lib/events.ts` | neu | Reine Funktion: Roles aus RoleTemplates materialisieren |
| `app/auth/callback/route.ts` | modifizieren | Person-User-Linking nach Login einbauen |
| `app/(owner)/layout.tsx` | modifizieren | Nav-Links (Dashboard / Templates) in TopBar |
| `app/(owner)/dashboard/page.tsx` | ersetzen | Event-Liste mit Status-Chips |
| `app/(owner)/templates/page.tsx` | neu | Template-Liste |
| `app/(owner)/templates/[id]/page.tsx` | neu | Template-Detail |
| `app/(owner)/events/new/actions.ts` | neu | Server Action: Event + Roles in DB speichern |
| `app/(owner)/events/new/wizard.tsx` | neu | 3-Step Wizard Client Component |
| `app/(owner)/events/new/page.tsx` | neu | Wrapper-Page für Wizard |
| `app/(owner)/events/[id]/page.tsx` | neu | Event-Detail |
| `tests/unit/mappers.test.ts` | neu | Unit-Tests für Mapper |
| `tests/unit/events.test.ts` | neu | Unit-Tests für materializeRoles |
| `tests/unit/auth-linking.test.ts` | neu | Unit-Tests für linkPersonToUser |

---

## Task 1: Supabase TypeScript-Typen generieren

**Files:**
- Create: `lib/supabase/types.ts`

- [ ] **Step 1: CLI ausführen**

```bash
npx supabase gen types typescript --project-id lvdezpdhjnbppphboxyd > lib/supabase/types.ts
```

Erwartetes Ergebnis: Datei enthält `export type Database = { public: { Tables: { persons: ..., production_templates: ..., events: ..., roles: ..., bookings: ... } } }`

- [ ] **Step 2: Hilfstypes-Alias ans Ende der Datei anfügen**

Öffne `lib/supabase/types.ts`, füge am Ende an:

```typescript
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
```

Falls dieser Alias bereits von der CLI generiert wurde, diesen Schritt überspringen.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat: generate supabase typescript types"
```

---

## Task 2: Mapper-Utilities implementieren (TDD)

**Files:**
- Create: `lib/supabase/mappers.ts`
- Create: `tests/unit/mappers.test.ts`

- [ ] **Step 1: Failing Tests schreiben**

Erstelle `tests/unit/mappers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { personMapper, templateMapper, eventMapper, roleMapper, bookingMapper } from '@/lib/supabase/mappers'

describe('personMapper.fromDb', () => {
  it('mapped camelCase Felder korrekt', () => {
    const row = {
      id: 'p1',
      user_id: 'u1',
      name: 'Max Müller',
      phone: '+41791234567',
      email: 'max@example.com',
      photo_url: null,
      skills: ['camera', 'evs'],
      notes: 'Notiz',
      role: 'freelancer',
      created_at: '2026-01-01T00:00:00Z',
    }
    const result = personMapper.fromDb(row as any)
    expect(result.userId).toBe('u1')
    expect(result.photoUrl).toBeNull()
    expect(result.skills).toEqual(['camera', 'evs'])
    expect(result.createdAt).toBe('2026-01-01T00:00:00Z')
  })
})

describe('templateMapper.fromDb', () => {
  it('parst JSONB-Felder korrekt', () => {
    const row = {
      id: 't1',
      name: 'NL2 Heimspiel',
      phases: [{ name: 'Rigging', defaultDurationHours: 4 }],
      role_templates: [{ title: 'EVS-Operator', count: 1, preferredPersonIds: [] }],
      default_venue_info: 'Eingang Nord',
      created_at: '2026-01-01T00:00:00Z',
    }
    const result = templateMapper.fromDb(row as any)
    expect(result.phases[0].name).toBe('Rigging')
    expect(result.roleTemplates[0].title).toBe('EVS-Operator')
    expect(result.defaultVenueInfo).toBe('Eingang Nord')
  })
})

describe('eventMapper.fromDb', () => {
  it('parst JSONB venue und phases', () => {
    const row = {
      id: 'e1',
      template_id: 't1',
      title: 'EHC Chur vs. HC Davos',
      phases: [{ name: 'Live', startTime: '2026-04-12T15:00:00Z', endTime: '2026-04-12T22:00:00Z' }],
      venue: { name: 'Eissporthalle', address: 'Str. 1', gpsLat: 46.8, gpsLng: 9.5, parkingInfo: 'P1', accessInfo: 'Tor A' },
      status: 'draft',
      documents: [],
      notes: '',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    const result = eventMapper.fromDb(row as any)
    expect(result.status).toBe('draft')
    expect(result.venue.name).toBe('Eissporthalle')
    expect(result.phases[0].startTime).toBe('2026-04-12T15:00:00Z')
  })
})

describe('roleMapper.fromDb', () => {
  it('mapped eventId und assignedPersonId', () => {
    const row = { id: 'r1', event_id: 'e1', title: 'Kameramann 1', assigned_person_id: null, created_at: '2026-01-01T00:00:00Z' }
    const result = roleMapper.fromDb(row as any)
    expect(result.eventId).toBe('e1')
    expect(result.assignedPersonId).toBeNull()
  })
})

describe('bookingMapper.fromDb', () => {
  it('mapped snake_case zu camelCase', () => {
    const row = {
      id: 'b1', role_id: 'r1', person_id: 'p1',
      status: 'sent', requested_at: '2026-01-01T00:00:00Z',
      responded_at: null, decline_reason: null, created_at: '2026-01-01T00:00:00Z',
    }
    const result = bookingMapper.fromDb(row as any)
    expect(result.roleId).toBe('r1')
    expect(result.respondedAt).toBeNull()
  })
})
```

- [ ] **Step 2: Tests ausführen — müssen FEHLSCHLAGEN**

```bash
npx vitest run tests/unit/mappers.test.ts
```

Erwartetes Ergebnis: `Cannot find module '@/lib/supabase/mappers'`

- [ ] **Step 3: Mapper implementieren**

Erstelle `lib/supabase/mappers.ts`:

```typescript
import type { Database } from './types'
import type {
  Person, ProductionTemplate, Event, Role, Booking,
  Skill, EventStatus, BookingStatus,
  TemplatePhase, RoleTemplate, ConcretePhase, Venue, EventDocument,
} from '../types'

type PersonRow = Database['public']['Tables']['persons']['Row']
type TemplateRow = Database['public']['Tables']['production_templates']['Row']
type EventRow = Database['public']['Tables']['events']['Row']
type RoleRow = Database['public']['Tables']['roles']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']

export const personMapper = {
  fromDb(row: PersonRow): Person {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      photoUrl: row.photo_url,
      skills: (row.skills ?? []) as Skill[],
      notes: row.notes ?? '',
      role: row.role as Person['role'],
      createdAt: row.created_at,
    }
  },
}

export const templateMapper = {
  fromDb(row: TemplateRow): ProductionTemplate {
    return {
      id: row.id,
      name: row.name,
      phases: (row.phases as unknown as TemplatePhase[]) ?? [],
      roleTemplates: (row.role_templates as unknown as RoleTemplate[]) ?? [],
      defaultVenueInfo: row.default_venue_info ?? '',
      createdAt: row.created_at,
    }
  },
}

export const eventMapper = {
  fromDb(row: EventRow): Event {
    return {
      id: row.id,
      templateId: row.template_id,
      title: row.title,
      phases: (row.phases as unknown as ConcretePhase[]) ?? [],
      venue: (row.venue as unknown as Venue) ?? {
        name: '', address: '', gpsLat: 0, gpsLng: 0, parkingInfo: '', accessInfo: '',
      },
      status: row.status as EventStatus,
      documents: (row.documents as unknown as EventDocument[]) ?? [],
      notes: row.notes ?? '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  },
}

export const roleMapper = {
  fromDb(row: RoleRow): Role {
    return {
      id: row.id,
      eventId: row.event_id,
      title: row.title,
      assignedPersonId: row.assigned_person_id,
      createdAt: row.created_at,
    }
  },
}

export const bookingMapper = {
  fromDb(row: BookingRow): Booking {
    return {
      id: row.id,
      roleId: row.role_id,
      personId: row.person_id,
      status: row.status as BookingStatus,
      requestedAt: row.requested_at,
      respondedAt: row.responded_at,
      declineReason: row.decline_reason,
      createdAt: row.created_at,
    }
  },
}
```

- [ ] **Step 4: Tests ausführen — müssen BESTEHEN**

```bash
npx vitest run tests/unit/mappers.test.ts
```

Erwartetes Ergebnis: `5 tests passed`

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/mappers.ts tests/unit/mappers.test.ts
git commit -m "feat: add supabase mapper utilities with tests"
```

---

## Task 3: Person-User-Linking-Logik (TDD)

**Files:**
- Create: `lib/auth-linking.ts`
- Create: `tests/unit/auth-linking.test.ts`

- [ ] **Step 1: Failing Test schreiben**

Erstelle `tests/unit/auth-linking.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { linkPersonToUser } from '@/lib/auth-linking'

function makeSupabase(personRow: { id: string; user_id: string | null } | null) {
  const updateMock = vi.fn().mockResolvedValue({ error: null })
  const eqUpdate = vi.fn(() => ({ error: null, data: null }))
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: personRow, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: eqUpdate,
      })),
    })),
    _eqUpdate: eqUpdate,
    _updateMock: updateMock,
  }
}

describe('linkPersonToUser', () => {
  it('gibt "no_person" zurück wenn kein Match per E-Mail', async () => {
    const supabase = makeSupabase(null)
    const result = await linkPersonToUser(supabase as any, 'uid1', 'unknown@x.com')
    expect(result).toBe('no_person')
  })

  it('gibt "already_linked" zurück wenn user_id bereits gesetzt', async () => {
    const supabase = makeSupabase({ id: 'p1', user_id: 'existing-uid' })
    const result = await linkPersonToUser(supabase as any, 'uid1', 'max@x.com')
    expect(result).toBe('already_linked')
  })

  it('gibt "linked" zurück und führt UPDATE aus wenn user_id null', async () => {
    const supabase = makeSupabase({ id: 'p1', user_id: null })
    const result = await linkPersonToUser(supabase as any, 'uid1', 'max@x.com')
    expect(result).toBe('linked')
    expect(supabase.from).toHaveBeenCalledWith('persons')
  })
})
```

- [ ] **Step 2: Tests ausführen — müssen FEHLSCHLAGEN**

```bash
npx vitest run tests/unit/auth-linking.test.ts
```

Erwartetes Ergebnis: `Cannot find module '@/lib/auth-linking'`

- [ ] **Step 3: Funktion implementieren**

Erstelle `lib/auth-linking.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

export async function linkPersonToUser(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<'linked' | 'already_linked' | 'no_person'> {
  const { data: person } = await supabase
    .from('persons')
    .select('id, user_id')
    .eq('email', email)
    .single()

  if (!person) return 'no_person'
  if (person.user_id) return 'already_linked'

  await supabase
    .from('persons')
    .update({ user_id: userId })
    .eq('id', person.id)

  return 'linked'
}
```

- [ ] **Step 4: Tests ausführen — müssen BESTEHEN**

```bash
npx vitest run tests/unit/auth-linking.test.ts
```

Erwartetes Ergebnis: `3 tests passed`

- [ ] **Step 5: Commit**

```bash
git add lib/auth-linking.ts tests/unit/auth-linking.test.ts
git commit -m "feat: add person-user linking utility with tests"
```

---

## Task 4: Auth Callback erweitern

**Files:**
- Modify: `app/auth/callback/route.ts`

- [ ] **Step 1: Route aktualisieren**

Ersetze den kompletten Inhalt von `app/auth/callback/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { linkPersonToUser } from '@/lib/auth-linking'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        await linkPersonToUser(supabase, user.id, user.email)
      }
      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

- [ ] **Step 2: Manuell testen**

Dev-Server starten (`npm run dev`), mit einer Freelancer-E-Mail (z. B. `anna.meier@ehcchur.ch` aus Seed-Daten) Magic Link anfordern, Link klicken, dann in Supabase Dashboard prüfen: `persons`-Row hat jetzt `user_id` gesetzt.

- [ ] **Step 3: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "feat: link person to user on first login via auth callback"
```

---

## Task 5: Role-Materialisierung implementieren (TDD)

**Files:**
- Create: `lib/events.ts`
- Create: `tests/unit/events.test.ts`

- [ ] **Step 1: Failing Tests schreiben**

Erstelle `tests/unit/events.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { materializeRoles } from '@/lib/events'

describe('materializeRoles', () => {
  it('erstellt eine Role-Row pro count', () => {
    const roles = materializeRoles('event-1', [
      { title: 'Kameramann', count: 2, preferredPersonIds: [] },
      { title: 'EVS-Operator', count: 1, preferredPersonIds: [] },
    ])
    expect(roles).toHaveLength(3)
    expect(roles.filter(r => r.title === 'Kameramann')).toHaveLength(2)
    expect(roles.filter(r => r.title === 'EVS-Operator')).toHaveLength(1)
  })

  it('setzt event_id auf alle Rows', () => {
    const roles = materializeRoles('event-42', [
      { title: 'Toningenieur', count: 1, preferredPersonIds: [] },
    ])
    expect(roles[0].event_id).toBe('event-42')
  })

  it('gibt leeres Array für leere roleTemplates zurück', () => {
    const roles = materializeRoles('event-1', [])
    expect(roles).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Tests ausführen — müssen FEHLSCHLAGEN**

```bash
npx vitest run tests/unit/events.test.ts
```

Erwartetes Ergebnis: `Cannot find module '@/lib/events'`

- [ ] **Step 3: Funktion implementieren**

Erstelle `lib/events.ts`:

```typescript
import type { RoleTemplate } from './types'

export interface RoleInsert {
  event_id: string
  title: string
}

export function materializeRoles(
  eventId: string,
  roleTemplates: RoleTemplate[],
): RoleInsert[] {
  return roleTemplates.flatMap(rt =>
    Array.from({ length: rt.count }, () => ({
      event_id: eventId,
      title: rt.title,
    })),
  )
}
```

- [ ] **Step 4: Tests ausführen — müssen BESTEHEN**

```bash
npx vitest run tests/unit/events.test.ts
```

Erwartetes Ergebnis: `3 tests passed`

- [ ] **Step 5: Commit**

```bash
git add lib/events.ts tests/unit/events.test.ts
git commit -m "feat: add role materialization utility with tests"
```

---

## Task 6: Event-Erstellungs Server Action

**Files:**
- Create: `app/(owner)/events/new/actions.ts`

- [ ] **Step 1: Server Action erstellen**

Erstelle `app/(owner)/events/new/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { materializeRoles } from '@/lib/events'
import { redirect } from 'next/navigation'
import type { ConcretePhase, Venue, RoleTemplate } from '@/lib/types'

export async function createEventAction(data: {
  templateId: string
  title: string
  phases: ConcretePhase[]
  venue: Venue
  notes: string
  roleTemplates: RoleTemplate[]
}): Promise<{ error: string } | never> {
  const supabase = await createClient()

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      template_id: data.templateId,
      title: data.title,
      phases: data.phases as any,
      venue: data.venue as any,
      status: 'draft',
      documents: [],
      notes: data.notes,
    })
    .select('id')
    .single()

  if (error || !event) {
    return { error: error?.message ?? 'Event konnte nicht erstellt werden' }
  }

  const roles = materializeRoles(event.id, data.roleTemplates)
  if (roles.length > 0) {
    const { error: rolesError } = await supabase.from('roles').insert(roles)
    if (rolesError) return { error: rolesError.message }
  }

  redirect(`/events/${event.id}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(owner\)/events/new/actions.ts
git commit -m "feat: add event creation server action"
```

---

## Task 7: Navigation im Owner Layout

**Files:**
- Modify: `app/(owner)/layout.tsx`

- [ ] **Step 1: Nav-Links in TopBar einbauen**

Ersetze den kompletten Inhalt von `app/(owner)/layout.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/ui/top-bar'
import Link from 'next/link'

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: person } = await supabase
    .from('persons')
    .select('name, role')
    .eq('user_id', user.id)
    .single()

  if (person?.role !== 'owner') redirect('/home')

  const nav = (
    <nav className="flex items-center gap-4">
      <Link
        href="/dashboard"
        className="label-control text-muted-foreground hover:text-foreground transition-colors"
      >
        Dashboard
      </Link>
      <Link
        href="/templates"
        className="label-control text-muted-foreground hover:text-foreground transition-colors"
      >
        Templates
      </Link>
    </nav>
  )

  return (
    <div className="min-h-screen bg-background">
      <TopBar userName={person?.name} right={nav} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(owner\)/layout.tsx
git commit -m "feat: add nav links to owner layout"
```

---

## Task 8: Dashboard mit Event-Liste

**Files:**
- Modify: `app/(owner)/dashboard/page.tsx`

- [ ] **Step 1: Dashboard-Page ersetzen**

Ersetze den kompletten Inhalt von `app/(owner)/dashboard/page.tsx`:

```typescript
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
    .order('created_at', { ascending: false })

  const events = (rows ?? []).map(eventMapper.fromDb)

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
        <div className="ghost-border rounded-lg bg-level-2 p-12 text-center text-muted-foreground text-sm">
          Noch keine Events. Erstelle ein Event aus einem Template.
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(event => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="flex items-center justify-between ghost-border rounded-lg bg-level-1 px-5 py-4 hover:bg-level-2 transition-colors group"
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
```

- [ ] **Step 2: Manuell verifizieren**

```bash
npm run dev
```

Browser öffnen: `http://localhost:3000/dashboard` — Event-Liste erscheint (mit Seed-Daten leer oder mit vorhandenen Events). "Neues Event" Button sichtbar.

- [ ] **Step 3: Commit**

```bash
git add app/\(owner\)/dashboard/page.tsx
git commit -m "feat: replace dashboard stub with event list"
```

---

## Task 9: Template-Liste und Detail

**Files:**
- Create: `app/(owner)/templates/page.tsx`
- Create: `app/(owner)/templates/[id]/page.tsx`

- [ ] **Step 1: Template-Listen-Page erstellen**

Erstelle `app/(owner)/templates/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { templateMapper } from '@/lib/supabase/mappers'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('production_templates')
    .select('*')
    .order('created_at', { ascending: false })

  const templates = (rows ?? []).map(templateMapper.fromDb)

  return (
    <div className="space-y-6">
      <div>
        <p className="label-control text-muted-foreground mb-1">Vorlagen</p>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ letterSpacing: '-0.02em' }}
        >
          Templates
        </h1>
      </div>

      {templates.length === 0 ? (
        <div className="ghost-border rounded-lg bg-level-2 p-12 text-center text-muted-foreground text-sm">
          Keine Templates vorhanden.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(template => (
            <Link
              key={template.id}
              href={`/templates/${template.id}`}
              className="flex items-center justify-between ghost-border rounded-lg bg-level-1 px-5 py-4 hover:bg-level-2 transition-colors group"
            >
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">{template.name}</p>
                <p className="data-technical text-xs text-muted-foreground">
                  {template.roleTemplates.length} Rollen · {template.phases.length} Phasen
                </p>
              </div>
              <span className="label-control text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Details →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Template-Detail-Page erstellen**

Erstelle `app/(owner)/templates/[id]/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { templateMapper } from '@/lib/supabase/mappers'
import { Button } from '@/components/ui/button'
import { ProductionChip } from '@/components/ui/production-chip'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('production_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (!row) notFound()
  const template = templateMapper.fromDb(row)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-control text-muted-foreground mb-1">Template</p>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ letterSpacing: '-0.02em' }}
          >
            {template.name}
          </h1>
        </div>
        <Button asChild>
          <Link href={`/events/new?templateId=${template.id}`}>Event erstellen</Link>
        </Button>
      </div>

      {/* Phasen */}
      <section className="space-y-3">
        <h2 className="label-control text-muted-foreground">Phasen</h2>
        <div className="space-y-2">
          {template.phases.map((phase, i) => (
            <div
              key={i}
              className="flex items-center justify-between ghost-border rounded-lg bg-level-1 px-5 py-3"
            >
              <span className="font-medium text-foreground">{phase.name}</span>
              <span className="data-technical text-sm text-muted-foreground">
                {phase.defaultDurationHours} h
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Rollen */}
      <section className="space-y-3">
        <h2 className="label-control text-muted-foreground">Rollen</h2>
        <div className="space-y-2">
          {template.roleTemplates.map((rt, i) => (
            <div
              key={i}
              className="flex items-center justify-between ghost-border rounded-lg bg-level-1 px-5 py-3"
            >
              <div className="flex items-center gap-3">
                <ProductionChip>{rt.title}</ProductionChip>
                {rt.count > 1 && (
                  <span className="data-technical text-xs text-muted-foreground">
                    × {rt.count}
                  </span>
                )}
              </div>
              <span className="data-technical text-xs text-muted-foreground">
                {rt.preferredPersonIds.length} bevorzugt
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Venue-Info */}
      {template.defaultVenueInfo && (
        <section className="space-y-3">
          <h2 className="label-control text-muted-foreground">Standard-Venue-Info</h2>
          <div className="ghost-border rounded-lg bg-level-1 px-5 py-4 text-sm text-muted-foreground whitespace-pre-wrap">
            {template.defaultVenueInfo}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Manuell verifizieren**

```bash
npm run dev
```

Browser: `http://localhost:3000/templates` — Template-Liste sichtbar. Klick auf Template öffnet Detail mit Phasen und Rollen.

- [ ] **Step 4: Commit**

```bash
git add app/\(owner\)/templates/
git commit -m "feat: add template list and detail pages (read-only)"
```

---

## Task 10: Event-Erstellungs-Wizard

**Files:**
- Create: `app/(owner)/events/new/wizard.tsx`
- Create: `app/(owner)/events/new/page.tsx`

- [ ] **Step 1: Wizard Client Component erstellen**

Erstelle `app/(owner)/events/new/wizard.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createEventAction } from './actions'
import type { ProductionTemplate, ConcretePhase, Venue } from '@/lib/types'

interface WizardProps {
  templates: ProductionTemplate[]
  initialTemplateId?: string
}

type Step = 1 | 2 | 3

interface FormState {
  selectedTemplate: ProductionTemplate | null
  title: string
  phases: ConcretePhase[]
  venue: Venue
  notes: string
}

const emptyVenue: Venue = {
  name: '', address: '', gpsLat: 0, gpsLng: 0, parkingInfo: '', accessInfo: '',
}

export function EventWizard({ templates, initialTemplateId }: WizardProps) {
  const [step, setStep] = useState<Step>(initialTemplateId ? 2 : 1)
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const initialTemplate = initialTemplateId
    ? (templates.find(t => t.id === initialTemplateId) ?? null)
    : null

  const [form, setForm] = useState<FormState>({
    selectedTemplate: initialTemplate,
    title: initialTemplate?.name ?? '',
    phases: initialTemplate?.phases.map(p => ({ name: p.name, startTime: '', endTime: '' })) ?? [],
    venue: emptyVenue,
    notes: '',
  })

  function selectTemplate(template: ProductionTemplate) {
    setForm({
      selectedTemplate: template,
      title: template.name,
      phases: template.phases.map(p => ({ name: p.name, startTime: '', endTime: '' })),
      venue: emptyVenue,
      notes: '',
    })
    setStep(2)
  }

  function updatePhase(index: number, field: 'startTime' | 'endTime', value: string) {
    setForm(f => {
      const phases = [...f.phases]
      phases[index] = { ...phases[index], [field]: value }
      return { ...f, phases }
    })
  }

  function step2Valid(): boolean {
    return (
      form.title.trim().length > 0 &&
      form.phases.every(p => p.startTime && p.endTime && p.endTime > p.startTime)
    )
  }

  function handleSubmit() {
    if (!form.selectedTemplate) return
    setServerError(null)
    startTransition(async () => {
      const result = await createEventAction({
        templateId: form.selectedTemplate!.id,
        title: form.title,
        phases: form.phases,
        venue: form.venue,
        notes: form.notes,
        roleTemplates: form.selectedTemplate!.roleTemplates,
      })
      if (result && 'error' in result) {
        setServerError(result.error)
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Step-Indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-signal-green' : 'bg-level-3'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Template wählen */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <p className="label-control text-muted-foreground mb-1">Schritt 1 / 3</p>
            <h2 className="text-xl font-bold text-foreground">Template wählen</h2>
          </div>
          <div className="space-y-2">
            {templates.map(template => (
              <button
                key={template.id}
                onClick={() => selectTemplate(template)}
                className="w-full text-left ghost-border rounded-lg bg-level-1 px-5 py-4 hover:bg-level-2 transition-colors"
              >
                <p className="font-medium text-foreground">{template.name}</p>
                <p className="data-technical text-xs text-muted-foreground mt-0.5">
                  {template.roleTemplates.reduce((sum, rt) => sum + rt.count, 0)} Rollen ·{' '}
                  {template.phases.length} Phasen
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Titel & Zeiten */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <p className="label-control text-muted-foreground mb-1">Schritt 2 / 3</p>
            <h2 className="text-xl font-bold text-foreground">Datum & Zeiten</h2>
          </div>

          <div className="space-y-2">
            <label className="label-control text-muted-foreground text-xs">Event-Titel</label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="z. B. EHC Chur vs. HC Davos"
            />
          </div>

          <div className="space-y-4">
            {form.phases.map((phase, i) => (
              <div key={i} className="ghost-border rounded-lg bg-level-1 p-4 space-y-3">
                <p className="label-control text-foreground text-xs">{phase.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="label-control text-muted-foreground text-xs">Start</label>
                    <Input
                      type="datetime-local"
                      value={phase.startTime}
                      onChange={e => updatePhase(i, 'startTime', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="label-control text-muted-foreground text-xs">Ende</label>
                    <Input
                      type="datetime-local"
                      value={phase.endTime}
                      onChange={e => updatePhase(i, 'endTime', e.target.value)}
                    />
                  </div>
                </div>
                {phase.startTime && phase.endTime && phase.endTime <= phase.startTime && (
                  <p className="text-xs text-tally-red">Ende muss nach Start liegen.</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>
              Zurück
            </Button>
            <Button onClick={() => setStep(3)} disabled={!step2Valid()}>
              Weiter
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Venue & Notizen */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <p className="label-control text-muted-foreground mb-1">Schritt 3 / 3</p>
            <h2 className="text-xl font-bold text-foreground">Venue & Notizen</h2>
          </div>

          <div className="space-y-4">
            {(
              [
                { field: 'name', label: 'Venue-Name', placeholder: 'Eissportzentrum Chur' },
                { field: 'address', label: 'Adresse', placeholder: 'Güterstrasse 5, 7000 Chur' },
                { field: 'parkingInfo', label: 'Parkplatz-Info', placeholder: 'Eingang Nord, Tor B' },
                { field: 'accessInfo', label: 'Zufahrt / Zugang', placeholder: 'Ü-Wagen Tor A' },
              ] as const
            ).map(({ field, label, placeholder }) => (
              <div key={field} className="space-y-1">
                <label className="label-control text-muted-foreground text-xs">{label}</label>
                <Input
                  value={(form.venue as any)[field]}
                  onChange={e =>
                    setForm(f => ({ ...f, venue: { ...f.venue, [field]: e.target.value } }))
                  }
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <label className="label-control text-muted-foreground text-xs">Notizen (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Besonderheiten, Hinweise..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {serverError && (
            <p className="text-sm text-tally-red">{serverError}</p>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} disabled={isPending}>
              Zurück
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Wird gespeichert…' : 'Als Entwurf speichern'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wrapper-Page erstellen**

Erstelle `app/(owner)/events/new/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { templateMapper } from '@/lib/supabase/mappers'
import { EventWizard } from './wizard'

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string }>
}) {
  const { templateId } = await searchParams
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('production_templates')
    .select('*')
    .order('name')

  const templates = (rows ?? []).map(templateMapper.fromDb)

  return (
    <div className="space-y-6">
      <div>
        <p className="label-control text-muted-foreground mb-1">Neues Event</p>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ letterSpacing: '-0.02em' }}
        >
          Event erstellen
        </h1>
      </div>
      <EventWizard templates={templates} initialTemplateId={templateId} />
    </div>
  )
}
```

- [ ] **Step 3: Manuell testen**

```bash
npm run dev
```

1. `http://localhost:3000/events/new` öffnen
2. Template wählen → Schritt 1 geht zu Schritt 2
3. Titel + Zeiten eingeben → Weiter-Button wird aktiv
4. Venue ausfüllen → "Als Entwurf speichern" klicken
5. Redirect zu `/events/[id]` — noch nicht vorhanden, gibt 404 (OK für jetzt)
6. Supabase Dashboard prüfen: `events`-Tabelle hat neuen Eintrag, `roles`-Tabelle hat die materialisierten Rollen

- [ ] **Step 4: Commit**

```bash
git add app/\(owner\)/events/new/
git commit -m "feat: add 3-step event creation wizard"
```

---

## Task 11: Event-Detail-Page

**Files:**
- Create: `app/(owner)/events/[id]/page.tsx`

- [ ] **Step 1: Event-Detail-Page erstellen**

Erstelle `app/(owner)/events/[id]/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { eventMapper, roleMapper } from '@/lib/supabase/mappers'
import { Button } from '@/components/ui/button'
import { ProductionChip } from '@/components/ui/production-chip'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { EventStatus } from '@/lib/types'

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

  const [{ data: eventRow }, { data: roleRows }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('roles').select('*').eq('event_id', id).order('created_at'),
  ])

  if (!eventRow) notFound()

  const event = eventMapper.fromDb(eventRow)
  const roles = (roleRows ?? []).map(roleMapper.fromDb)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="label-control text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ letterSpacing: '-0.02em' }}
          >
            {event.title}
          </h1>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass(event.status)}`}
        >
          {statusLabel(event.status)}
        </span>
      </div>

      {/* Phasen */}
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
          <p className="font-medium text-foreground">{event.venue.name}</p>
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

      {/* Rollen */}
      <section className="space-y-3">
        <h2 className="label-control text-muted-foreground">
          Rollen ({roles.length})
        </h2>
        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Rollen vorhanden.</p>
        ) : (
          <div className="space-y-2">
            {roles.map(role => (
              <div
                key={role.id}
                className="flex items-center justify-between ghost-border rounded-lg bg-level-1 px-5 py-3"
              >
                <ProductionChip>{role.title}</ProductionChip>
                <span className="data-technical text-xs text-muted-foreground">
                  offen
                </span>
              </div>
            ))}
          </div>
        )}
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
```

- [ ] **Step 2: Manuell testen**

```bash
npm run dev
```

1. Wizard komplett durchlaufen
2. Redirect landet auf `/events/[id]` — Seite zeigt Titel, Status-Chip "Entwurf", Phasen, Venue, Rollen
3. "← Dashboard" Link funktioniert

- [ ] **Step 3: Commit**

```bash
git add app/\(owner\)/events/\[id\]/page.tsx
git commit -m "feat: add event detail page"
```

---

## Task 12: Abschluss-Verifikation

- [ ] **Step 1: Alle Unit-Tests laufen lassen**

```bash
npm test
```

Erwartetes Ergebnis: alle Tests grün (inkl. bestehende 18 aus Design System + 7 aus Foundation). Neu hinzu: ~11 Tests (mappers: 5, events: 3, auth-linking: 3).

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Erwartetes Ergebnis: keine Fehler

- [ ] **Step 3: Production Build**

```bash
npm run build
```

Erwartetes Ergebnis: Build erfolgreich, keine TypeScript-Fehler

- [ ] **Step 4: Manueller End-to-End Flow**

```
1. /login → Magic Link → Weiterleitung zu /dashboard
2. /dashboard → zeigt Event-Liste (leer oder mit Seed-Events), "+ Neues Event" Button sichtbar
3. /templates → Template-Liste, Klick auf Template öffnet Detail
4. /templates/[id] → Phasen + Rollen sichtbar, "Event erstellen" Button
5. "Event erstellen" → /events/new?templateId=[id] → Wizard startet auf Schritt 2
6. Schritt 2: Titel anpassen, Zeiten für alle Phasen eingeben
7. Schritt 3: Venue prüfen, speichern
8. Redirect zu /events/[id] → Event-Detail zeigt Zeitplan, Venue, Rollen (alle "offen")
9. /dashboard → neues Event erscheint in Liste mit Status "Entwurf"
```

- [ ] **Step 5: PROGRESS.md aktualisieren**

Füge Plan 2 als abgeschlossen in `PROGRESS.md` ein, inklusive was gebaut wurde.

- [ ] **Step 6: Final Commit**

```bash
git add PROGRESS.md
git commit -m "docs: mark plan 2 as complete in PROGRESS.md"
```

---

## Zusammenfassung

**12 Tasks, ~35 Steps.** Reihenfolge ist sequentiell — jede Task baut auf vorherigen auf (Types → Mapper → Action → Pages).

**Kritische Abhängigkeiten:**
- Task 1 (Supabase Types) muss vor Task 2 (Mapper) abgeschlossen sein
- Task 2 (Mapper) + Task 5 (materializeRoles) müssen vor Task 6 (Server Action) abgeschlossen sein
- Task 6 (Server Action) muss vor Task 10 (Wizard) abgeschlossen sein
