# People Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/people` Seite für den Owner — Freelancer anzeigen, editieren, löschen und neue einladen (Magic Link generieren + per E-Mail an Owner schicken).

**Architecture:** Server Component lädt alle Freelancer, rendert `<PersonList>` (Client Component). Server Actions in `actions.ts` übernehmen alle Mutationen. Pure Validierungslogik in `lib/people.ts` (testbar). Admin-Client (Service Role Key) wird nur für Magic-Link-Generierung verwendet.

**Tech Stack:** Next.js 16 App Router, Supabase Server Client, Supabase Admin Client (`@supabase/supabase-js`), Resend (fetch), Vitest, Tailwind CSS + shadcn/ui

---

## File Map

| Datei | Aktion | Verantwortlichkeit |
|---|---|---|
| `lib/people.ts` | Erstellen | Pure Validierungslogik |
| `tests/unit/people.test.ts` | Erstellen | Unit-Tests für `validatePersonInput` |
| `app/(owner)/people/actions.ts` | Erstellen | Server Actions: updatePerson, deletePerson, createPerson, generateAndSendInviteLink |
| `app/(owner)/people/page.tsx` | Erstellen | Server Component: Freelancer laden, PersonList rendern |
| `app/(owner)/people/person-list.tsx` | Erstellen | Client Component: Liste, Edit-Panel, Invite-Formular |
| `app/(owner)/layout.tsx` | Modifizieren | "People"-Nav-Link ergänzen |

---

## Task 1: Validierungslogik + Tests

**Files:**
- Create: `lib/people.ts`
- Create: `tests/unit/people.test.ts`

- [ ] **Schritt 1: Failing Tests schreiben**

Erstelle `tests/unit/people.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { validatePersonInput } from '@/lib/people'

describe('validatePersonInput', () => {
  it('gibt null zurück wenn Name und E-Mail vorhanden', () => {
    expect(validatePersonInput({ name: 'Max Muster', email: 'max@example.com' })).toBeNull()
  })

  it('gibt Fehler zurück wenn Name leer', () => {
    const result = validatePersonInput({ name: '', email: 'max@example.com' })
    expect(result).not.toBeNull()
    expect(result?.error).toContain('Name')
  })

  it('gibt Fehler zurück wenn Name nur Leerzeichen', () => {
    const result = validatePersonInput({ name: '   ', email: 'max@example.com' })
    expect(result).not.toBeNull()
  })

  it('gibt Fehler zurück wenn E-Mail leer', () => {
    const result = validatePersonInput({ name: 'Max', email: '' })
    expect(result).not.toBeNull()
    expect(result?.error).toContain('E-Mail')
  })

  it('gibt Fehler zurück bei ungültigem E-Mail-Format', () => {
    const result = validatePersonInput({ name: 'Max', email: 'kein-at-zeichen' })
    expect(result).not.toBeNull()
  })

  it('akzeptiert .ch Domain', () => {
    expect(validatePersonInput({ name: 'Max', email: 'max@example.ch' })).toBeNull()
  })
})
```

- [ ] **Schritt 2: Tests laufen lassen — müssen fehlschlagen**

```bash
npx vitest run tests/unit/people.test.ts
```

Erwartetes Ergebnis: FAIL mit „Cannot find module '@/lib/people'"

- [ ] **Schritt 3: Implementierung schreiben**

Erstelle `lib/people.ts`:

```typescript
export function validatePersonInput(data: { name: string; email: string }): { error: string } | null {
  if (!data.name.trim()) return { error: 'Name darf nicht leer sein' }
  if (!data.email.trim()) return { error: 'E-Mail darf nicht leer sein' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    return { error: 'Ungültige E-Mail-Adresse' }
  }
  return null
}
```

- [ ] **Schritt 4: Tests laufen lassen — müssen grün sein**

```bash
npx vitest run tests/unit/people.test.ts
```

Erwartetes Ergebnis: 6 Tests PASS

- [ ] **Schritt 5: Gesamte Test-Suite prüfen**

```bash
npm test
```

Erwartetes Ergebnis: alle 39 bestehenden + 6 neue = 45 Tests PASS

- [ ] **Schritt 6: Commit**

```bash
git add lib/people.ts tests/unit/people.test.ts
git commit -m "feat: add validatePersonInput with unit tests"
```

---

## Task 2: Server Actions

**Files:**
- Create: `app/(owner)/people/actions.ts`

- [ ] **Schritt 1: Datei anlegen**

Erstelle `app/(owner)/people/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { validatePersonInput } from '@/lib/people'
import type { Skill } from '@/lib/types'

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

export async function updatePersonAction(
  id: string,
  data: { name: string; email: string; phone: string; skills: Skill[]; notes: string },
): Promise<{ error: string } | void> {
  const validationError = validatePersonInput(data)
  if (validationError) return validationError

  const { error, supabase } = await requireOwner()
  if (error || !supabase) return { error: error ?? 'Fehler' }

  const { error: dbError } = await supabase
    .from('persons')
    .update({
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      skills: data.skills,
      notes: data.notes,
    })
    .eq('id', id)

  if (dbError) return { error: dbError.message }
  revalidatePath('/people')
}

export async function deletePersonAction(id: string): Promise<{ error: string } | void> {
  const { error, supabase } = await requireOwner()
  if (error || !supabase) return { error: error ?? 'Fehler' }

  // bookings und roles.assigned_person_id werden via DB-Constraints automatisch behandelt
  // (bookings: ON DELETE CASCADE, roles.assigned_person_id: ON DELETE SET NULL)
  const { error: dbError } = await supabase
    .from('persons')
    .delete()
    .eq('id', id)

  if (dbError) return { error: dbError.message }
  revalidatePath('/people')
}

export async function createPersonAction(data: {
  name: string
  email: string
  phone: string
  skills: Skill[]
}): Promise<{ error: string } | { id: string }> {
  const validationError = validatePersonInput(data)
  if (validationError) return validationError

  const { error, supabase } = await requireOwner()
  if (error || !supabase) return { error: error ?? 'Fehler' }

  const { data: newPerson, error: dbError } = await supabase
    .from('persons')
    .insert({
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      skills: data.skills,
      role: 'freelancer',
    })
    .select('id')
    .single()

  if (dbError) return { error: dbError.message }
  revalidatePath('/people')
  return { id: newPerson.id }
}

export async function generateAndSendInviteLinkAction(
  email: string,
): Promise<{ error: string } | { link: string }> {
  const { error: ownerCheckError, supabase } = await requireOwner()
  if (ownerCheckError || !supabase) return { error: ownerCheckError ?? 'Fehler' }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${siteUrl}/auth/callback` },
  })

  if (linkError || !data?.properties?.action_link) {
    return { error: linkError?.message ?? 'Link konnte nicht generiert werden' }
  }

  const link = data.properties.action_link

  // Owner-E-Mail holen und Link per Resend zuschicken
  const { data: ownerRow } = await supabase
    .from('persons')
    .select('email')
    .eq('role', 'owner')
    .single()

  if (ownerRow?.email) {
    const from = process.env.NOTIFICATION_FROM_EMAIL ?? 'EventFlow <noreply@example.com>'
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [ownerRow.email],
        subject: `Login-Link für ${email}`,
        html: `
          <p>Du hast ein neues Crew-Mitglied eingeladen.</p>
          <p><strong>E-Mail:</strong> ${email}</p>
          <p>Login-Link (gültig 1 Stunde):</p>
          <p><a href="${link}">${link}</a></p>
          <p>Leite diesen Link an das neue Crew-Mitglied weiter.</p>
        `,
      }),
    }).catch(console.error)
  }

  return { link }
}
```

- [ ] **Schritt 2: Build prüfen**

```bash
npm run build 2>&1 | tail -20
```

Erwartetes Ergebnis: kein TypeScript-Fehler in `actions.ts`

- [ ] **Schritt 3: Commit**

```bash
git add app/"(owner)"/people/actions.ts
git commit -m "feat: add people management server actions"
```

---

## Task 3: Nav-Link + Server Component Page

**Files:**
- Modify: `app/(owner)/layout.tsx`
- Create: `app/(owner)/people/page.tsx`

- [ ] **Schritt 1: Nav-Link in layout.tsx ergänzen**

In `app/(owner)/layout.tsx` den `nav`-Block um einen dritten Link erweitern:

```typescript
// Vorher:
const nav = (
  <nav className="flex items-center gap-4">
    <Link href="/dashboard" className="label-control text-muted-foreground hover:text-foreground transition-colors">
      Dashboard
    </Link>
    <Link href="/templates" className="label-control text-muted-foreground hover:text-foreground transition-colors">
      Templates
    </Link>
  </nav>
)

// Nachher — "People"-Link anhängen:
const nav = (
  <nav className="flex items-center gap-4">
    <Link href="/dashboard" className="label-control text-muted-foreground hover:text-foreground transition-colors">
      Dashboard
    </Link>
    <Link href="/templates" className="label-control text-muted-foreground hover:text-foreground transition-colors">
      Templates
    </Link>
    <Link href="/people" className="label-control text-muted-foreground hover:text-foreground transition-colors">
      People
    </Link>
  </nav>
)
```

- [ ] **Schritt 2: Page-Server-Component erstellen**

Erstelle `app/(owner)/people/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { personMapper } from '@/lib/supabase/mappers'
import { PersonList } from './person-list'

export default async function PeoplePage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('persons')
    .select('*')
    .eq('role', 'freelancer')
    .order('name')

  const persons = (rows ?? []).map(personMapper.fromDb)

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Crew</h1>
      <PersonList persons={persons} />
    </div>
  )
}
```

- [ ] **Schritt 3: Temporären Platzhalter für PersonList erstellen**

Damit der Build nicht bricht, bevor Task 4 fertig ist — erstelle `app/(owner)/people/person-list.tsx` mit einem Stub:

```typescript
'use client'

import type { Person } from '@/lib/types'

export function PersonList({ persons }: { persons: Person[] }) {
  return <div className="text-sm text-muted-foreground">{persons.length} Freelancer</div>
}
```

- [ ] **Schritt 4: Build und Navigation prüfen**

```bash
npm run build 2>&1 | tail -20
```

Starte dann den Dev-Server und navigiere zu `/people`:

```bash
npm run dev
```

Erwartetes Ergebnis: Seite lädt, zeigt Anzahl Freelancer, Nav hat "People"-Link

- [ ] **Schritt 5: Commit**

```bash
git add app/"(owner)"/layout.tsx app/"(owner)"/people/page.tsx app/"(owner)"/people/person-list.tsx
git commit -m "feat: add /people page shell and nav link"
```

---

## Task 4: PersonList Client Component

**Files:**
- Modify: `app/(owner)/people/person-list.tsx` (Stub aus Task 3 ersetzen)

- [ ] **Schritt 1: Vollständige Implementierung schreiben**

Ersetze den Inhalt von `app/(owner)/people/person-list.tsx` komplett:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ProductionChip } from '@/components/ui/production-chip'
import {
  updatePersonAction,
  deletePersonAction,
  createPersonAction,
  generateAndSendInviteLinkAction,
} from './actions'
import type { Person, Skill } from '@/lib/types'

const SKILL_LABELS: Record<Skill, string> = {
  camera: 'Kamera',
  evs: 'EVS',
  audio: 'Audio',
  vision_mixing: 'Bildmischer',
  rf_tech: 'RF-Tech',
  replay: 'Replay',
  graphics: 'Grafik',
}

const ALL_SKILLS = Object.keys(SKILL_LABELS) as Skill[]

export function PersonList({ persons }: { persons: Person[] }) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  function toggleExpand(id: string) {
    setExpandedId(prev => (prev === id ? null : id))
  }

  function handleSaved() {
    setExpandedId(null)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {serverError && <p className="text-sm text-tally-red">{serverError}</p>}

      {persons.map(person => (
        <PersonRow
          key={person.id}
          person={person}
          isExpanded={expandedId === person.id}
          onToggle={() => toggleExpand(person.id)}
          onSaved={handleSaved}
          setServerError={setServerError}
        />
      ))}

      {persons.length === 0 && !showInviteForm && (
        <p className="text-sm text-muted-foreground">Noch keine Freelancer eingetragen.</p>
      )}

      {/* Invite-Form oder Button */}
      {!showInviteForm ? (
        <button
          onClick={() => { setShowInviteForm(true); setInviteLink(null) }}
          className="label-control text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
        >
          + Neuer Freelancer
        </button>
      ) : (
        <InviteForm
          onCancel={() => setShowInviteForm(false)}
          onCreated={(link) => {
            setInviteLink(link)
            setShowInviteForm(false)
            router.refresh()
          }}
          setServerError={setServerError}
        />
      )}

      {/* Generierter Link */}
      {inviteLink && (
        <div className="rounded-xl border border-signal-green/30 bg-signal-green/5 px-5 py-4 space-y-2">
          <p className="text-sm font-semibold text-signal-green">Login-Link generiert</p>
          <p className="text-xs text-muted-foreground">
            Per WhatsApp oder E-Mail weiterleiten. Gültig 1 Stunde.
            Der Link wurde auch an deine E-Mail gesendet.
          </p>
          <div className="flex items-start gap-2">
            <code className="text-xs text-foreground bg-level-2 rounded px-2 py-1 break-all flex-1">
              {inviteLink}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(inviteLink)}
              className="label-control text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1"
            >
              Kopieren
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PersonRow({
  person,
  isExpanded,
  onToggle,
  onSaved,
  setServerError,
}: {
  person: Person
  isExpanded: boolean
  onToggle: () => void
  onSaved: () => void
  setServerError: (e: string | null) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [name, setName] = useState(person.name)
  const [email, setEmail] = useState(person.email)
  const [phone, setPhone] = useState(person.phone)
  const [skills, setSkills] = useState<Skill[]>(person.skills)
  const [notes, setNotes] = useState(person.notes)

  function toggleSkill(skill: Skill) {
    setSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill],
    )
  }

  function handleSave() {
    startTransition(async () => {
      setServerError(null)
      const result = await updatePersonAction(person.id, { name, email, phone, skills, notes })
      if (result?.error) { setServerError(result.error); return }
      onSaved()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      setServerError(null)
      const result = await deletePersonAction(person.id)
      if (result?.error) { setServerError(result.error); return }
      onSaved()
    })
  }

  function handleCancel() {
    setName(person.name)
    setEmail(person.email)
    setPhone(person.phone)
    setSkills(person.skills)
    setNotes(person.notes)
    setConfirmDelete(false)
    onToggle()
  }

  return (
    <div className="rounded-xl border border-white/5 bg-background/40 backdrop-blur-xl shadow-lg hover:border-white/10 transition-colors">
      {/* Kopfzeile */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          <span className="font-medium truncate">{person.name}</span>
          <span className="text-sm text-muted-foreground hidden sm:block truncate">{person.email}</span>
          <span className="text-sm text-muted-foreground hidden md:block">{person.phone}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {person.skills.slice(0, 3).map(skill => (
            <ProductionChip key={skill} label={SKILL_LABELS[skill] ?? skill} />
          ))}
          {person.skills.length > 3 && (
            <span className="text-xs text-muted-foreground">+{person.skills.length - 3}</span>
          )}
          <span className="text-muted-foreground ml-1">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Edit-Panel */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="label-control text-xs text-muted-foreground">Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-level-2 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <div className="space-y-1">
              <label className="label-control text-xs text-muted-foreground">E-Mail *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-level-2 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <div className="space-y-1">
              <label className="label-control text-xs text-muted-foreground">Telefon</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-level-2 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <label className="label-control text-xs text-muted-foreground">Skills</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SKILLS.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    skills.includes(skill)
                      ? 'border-signal-green/50 bg-signal-green/10 text-signal-green'
                      : 'ghost-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {SKILL_LABELS[skill]}
                </button>
              ))}
            </div>
          </div>

          {/* Notizen */}
          <div className="space-y-1">
            <label className="label-control text-xs text-muted-foreground">Notizen</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-level-2 px-3 py-2 text-sm focus:outline-none focus:border-white/30 resize-none"
            />
          </div>

          {/* Aktionen */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? 'Wird gespeichert…' : 'Speichern'}
              </Button>
              <Button variant="ghost" onClick={handleCancel} disabled={isPending}>
                Abbrechen
              </Button>
            </div>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="label-control text-xs text-tally-red hover:text-foreground transition-colors"
              >
                Löschen
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-tally-red">Wirklich löschen?</span>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="label-control text-xs text-tally-red hover:text-foreground transition-colors"
                >
                  Ja
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="label-control text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Nein
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InviteForm({
  onCancel,
  onCreated,
  setServerError,
}: {
  onCancel: () => void
  onCreated: (link: string) => void
  setServerError: (e: string | null) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [skills, setSkills] = useState<Skill[]>([])

  function toggleSkill(skill: Skill) {
    setSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill],
    )
  }

  function handleSubmit() {
    startTransition(async () => {
      setServerError(null)
      const createResult = await createPersonAction({ name, email, phone, skills })
      if ('error' in createResult) { setServerError(createResult.error); return }

      const linkResult = await generateAndSendInviteLinkAction(email)
      if ('error' in linkResult) { setServerError(linkResult.error); return }

      onCreated(linkResult.link)
    })
  }

  return (
    <div className="rounded-xl border border-white/10 bg-background/40 backdrop-blur-xl px-5 py-5 space-y-4 mt-2">
      <h3 className="font-semibold text-sm">Neuer Freelancer</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="label-control text-xs text-muted-foreground">Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-level-2 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
          />
        </div>
        <div className="space-y-1">
          <label className="label-control text-xs text-muted-foreground">E-Mail *</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-level-2 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
          />
        </div>
        <div className="space-y-1">
          <label className="label-control text-xs text-muted-foreground">Telefon</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-level-2 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="label-control text-xs text-muted-foreground">Skills</label>
        <div className="flex flex-wrap gap-2">
          {ALL_SKILLS.map(skill => (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                skills.includes(skill)
                  ? 'border-signal-green/50 bg-signal-green/10 text-signal-green'
                  : 'ghost-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {SKILL_LABELS[skill]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Wird erstellt…' : 'Erstellen & Link generieren'}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={isPending}>
          Abbrechen
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Schritt 2: Build prüfen**

```bash
npm run build 2>&1 | tail -20
```

Erwartetes Ergebnis: kein Fehler

- [ ] **Schritt 3: Manuell testen**

Dev-Server starten (`npm run dev`), dann:

1. Zu `/people` navigieren — Freelancer-Liste sieht aus wie erwartet
2. Klick auf einen Freelancer — Edit-Panel öffnet sich
3. Name ändern, "Speichern" — Panel schliesst, Name in Liste aktualisiert
4. Skill toggling — Chips wechseln grün/grau
5. "Löschen" → Bestätigung → Person verschwindet aus Liste
6. "+ Neuer Freelancer" → Formular ausfüllen → "Erstellen & Link generieren" → Link-Box erscheint

- [ ] **Schritt 4: Alle Tests laufen lassen**

```bash
npm test
```

Erwartetes Ergebnis: 45 Tests PASS

- [ ] **Schritt 5: Commit**

```bash
git add app/"(owner)"/people/person-list.tsx lib/people.ts
git commit -m "feat: complete /people management with invite flow"
```

---

## Hinweis: Umgebungsvariablen in Vercel

`SUPABASE_SERVICE_ROLE_KEY` wird für die Magic-Link-Generierung benötigt. Prüfen ob dieser im Vercel-Projekt unter Settings → Environment Variables gesetzt ist. Der Wert findet sich im Supabase-Dashboard unter Project Settings → API → service_role key.
