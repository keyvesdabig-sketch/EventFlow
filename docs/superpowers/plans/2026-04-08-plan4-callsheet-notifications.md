# Plan 4: Call Sheet & E-Mail Notifications

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freelancer-Call-Sheet-Seite mit Zeitplan, Venue und Crew sowie automatische E-Mail-Benachrichtigungen bei neuen Anfragen, Event-Absagen und Tag-vorher-Erinnerungen.

**Architecture:** Neue Freelancer-Route `/events/[id]` als Server Component lädt Event-Daten und zeigt sie als langen Scroll. Alle drei E-Mail-Auslöser laufen über eine einzige generische Supabase Edge Function `send-notification-email` (Deno), die Resend als E-Mail-Provider nutzt. Server Actions rufen die Funktion via `supabase.functions.invoke()` auf; pg_cron ruft sie täglich via `net.http_post` für die Tageserinnerung auf.

**Tech Stack:** Next.js 16 App Router, Supabase Edge Functions (Deno), Resend API, pg_cron + pg_net, Supabase RLS

---

## Datei-Übersicht

| Aktion | Datei | Zweck |
|--------|-------|-------|
| Create | `app/(freelancer)/events/[id]/page.tsx` | Call Sheet Server Component |
| Create | `supabase/functions/send-notification-email/index.ts` | Generische E-Mail Edge Function |
| Create | `supabase/migrations/20260408_pg_cron_reminder.sql` | pg_cron Tageserinnerung |
| Modify | `app/(freelancer)/home/page.tsx` | Confirmed Events → anklickbare Links |
| Modify | `app/(owner)/events/[id]/actions.ts` | `sendBookingRequests` + neue `cancelEventAction` |
| Modify | `app/(owner)/events/[id]/page.tsx` | Cancel-Button + Bestätigungs-Dialog |

---

## Voraussetzungen (einmalig, manuell)

Bevor du startest, müssen diese Dienste konfiguriert sein:

**1. Resend-Account:**
- Account erstellen auf [resend.com](https://resend.com)
- Domain verifizieren (z.B. `antigravity.ch`)
- API-Key erstellen

**2. Supabase Secrets setzen** (im Supabase Dashboard → Edge Functions → Secrets, oder via CLI):
```bash
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set NOTIFICATION_FROM_EMAIL="EventFlow <noreply@antigravity.ch>"
```

**3. Service Role Key als DB-Setting** (im Supabase Dashboard → SQL Editor):
```sql
-- Service Role Key findest du im Dashboard unter Settings → API
ALTER DATABASE postgres SET "app.service_role_key" = 'eyJhbGc...dein-service-role-key...';
```

**4. pg_net Extension aktivieren** (im Supabase Dashboard → Database → Extensions):
- `pg_net` aktivieren (falls noch nicht aktiv)

---

## Task 1: Confirmed Events auf Freelancer Home anklickbar machen

**Files:**
- Modify: `app/(freelancer)/home/page.tsx`

- [ ] **Schritt 1: Import von Link hinzufügen und Event-Karte in Link umwandeln**

In `app/(freelancer)/home/page.tsx` den bestehenden Block für bestätigte Events anpassen. Ersetze die äussere `<div>` der Event-Karten durch einen `<Link>`:

```tsx
import Link from 'next/link'

// In der confirmedBookings.map(...)  — ersetze:
<div
  key={booking.id}
  className="ghost-border rounded-lg bg-level-1 px-5 py-4 space-y-1"
>
// durch:
<Link
  key={booking.id}
  href={`/events/${event.id}`}
  className="ghost-border rounded-lg bg-level-1 px-5 py-4 space-y-1 block hover:bg-level-2 transition-colors"
>
```

Schliessende `</div>` → `</Link>`.

- [ ] **Schritt 2: Dev-Server starten und manuell prüfen**

```bash
npm run dev
```

Einloggen als Freelancer (z.B. via `scripts/generate-login-link.mjs`), zur Home navigieren, auf ein bestätigtes Event klicken. Erwartung: Weiterleitung auf `/events/<id>` (404 im Moment, da Seite noch nicht existiert).

- [ ] **Schritt 3: Commit**

```bash
git add app/\(freelancer\)/home/page.tsx
git commit -m "feat: make confirmed event cards clickable on freelancer home"
```

---

## Task 2: Call Sheet Seite (Freelancer)

**Files:**
- Create: `app/(freelancer)/events/[id]/page.tsx`

Die Seite braucht Zugriff auf Crew-Daten (andere Personen), was die bestehende RLS nicht erlaubt. Wir lösen das mit einer `SECURITY DEFINER`-Funktion — gleicher Ansatz wie in Plan 3 für `my_confirmed_event_ids`.

- [ ] **Schritt 1: SECURITY DEFINER Funktion für Crew-Daten im SQL Editor erstellen**

Im Supabase Dashboard → SQL Editor ausführen:

```sql
-- Gibt alle bestätigten Crew-Mitglieder (Name, Phone, Rolle) für ein Event zurück.
-- SECURITY DEFINER: läuft als postgres-User, umgeht RLS auf persons.
CREATE OR REPLACE FUNCTION get_confirmed_crew(p_event_id uuid)
RETURNS TABLE (
  person_id   uuid,
  person_name text,
  phone       text,
  role_title  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id         AS person_id,
    p.name       AS person_name,
    p.phone      AS phone,
    r.title      AS role_title
  FROM bookings b
  JOIN roles    r ON b.role_id = r.id
  JOIN persons  p ON b.person_id = p.id
  WHERE r.event_id = p_event_id
    AND b.status = 'confirmed'
  ORDER BY r.created_at;
END;
$$;
```

Ausführen und prüfen dass kein Fehler kommt.

- [ ] **Schritt 2: Call Sheet Seite erstellen**

Neue Datei `app/(freelancer)/events/[id]/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { eventMapper, roleMapper } from '@/lib/supabase/mappers'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function CallSheetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Eigene Person-ID
  const { data: personRow } = await supabase
    .from('persons')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!personRow) notFound()

  // Event laden (RLS erlaubt Zugriff nur wenn bestätigte Buchung vorhanden)
  const { data: eventRow } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()
  if (!eventRow) notFound()

  const event = eventMapper.fromDb(eventRow)

  // Eigene bestätigte Rolle für dieses Event
  const { data: myBookingRow } = await supabase
    .from('bookings')
    .select('*, roles!inner(title, event_id)')
    .eq('person_id', personRow.id)
    .eq('status', 'confirmed')
    .eq('roles.event_id', id)
    .single()

  if (!myBookingRow) notFound() // kein Zugriff wenn nicht bestätigt

  const myRoleTitle = (myBookingRow as any).roles.title as string

  // Crew via SECURITY DEFINER Funktion laden
  const { data: crewRows } = await supabase
    .rpc('get_confirmed_crew', { p_event_id: id })

  const crew = crewRows ?? []

  const firstPhase = event.phases[0]

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('de-CH', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })

  const mapsUrl = event.venue.gpsLat && event.venue.gpsLng
    ? `https://maps.google.com/?q=${event.venue.gpsLat},${event.venue.gpsLng}`
    : `https://maps.google.com/?q=${encodeURIComponent(event.venue.address)}`

  const navUrl = event.venue.gpsLat && event.venue.gpsLng
    ? `https://maps.google.com/maps?daddr=${event.venue.gpsLat},${event.venue.gpsLng}`
    : `https://maps.google.com/maps?daddr=${encodeURIComponent(event.venue.address)}`

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/home"
          className="label-control text-muted-foreground hover:text-foreground transition-colors text-xs"
        >
          ← Home
        </Link>
        <div className="mt-2 border-l-4 border-tally-red pl-3">
          <p className="label-control text-tally-red text-xs mb-1">
            NL2 · BESTÄTIGT
          </p>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {event.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {firstPhase ? formatDate(firstPhase.startTime) : '—'}
            {' · Deine Rolle: '}
            <span className="text-signal-green">{myRoleTitle}</span>
          </p>
        </div>
      </div>

      {/* Zeitplan */}
      <section className="space-y-3">
        <h2 className="label-control text-muted-foreground">Zeitplan</h2>
        <div className="space-y-1">
          {event.phases.map((phase, i) => {
            const isLive = phase.name.toLowerCase().includes('live') ||
              phase.name.toLowerCase().includes('sendebeginn')
            return (
              <div
                key={i}
                className={`flex items-center gap-4 ghost-border rounded-lg bg-level-1 px-5 py-3 ${isLive ? 'border-tally-red/40' : ''}`}
              >
                <span className={`data-technical text-sm font-bold w-12 ${isLive ? 'text-tally-red' : 'text-pending-amber'}`}>
                  {formatTime(phase.startTime)}
                </span>
                <span className={`font-medium ${isLive ? 'text-tally-red' : 'text-foreground'}`}>
                  {phase.name}
                </span>
                <span className="data-technical text-xs text-muted-foreground ml-auto">
                  bis {formatTime(phase.endTime)}
                </span>
              </div>
            )
          })}
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
          <div className="flex gap-4 pt-1">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-pending-amber hover:text-pending-amber/80 transition-colors"
            >
              ↗ Karte öffnen
            </a>
            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-pending-amber hover:text-pending-amber/80 transition-colors"
            >
              ↗ Navigation starten
            </a>
          </div>
        </div>
      </section>

      {/* Crew */}
      <section className="space-y-3">
        <h2 className="label-control text-muted-foreground">Crew</h2>
        <div className="ghost-border rounded-lg bg-level-1 divide-y divide-ghost-border">
          {crew.map((member) => {
            const isMe = member.person_id === personRow.id
            return (
              <div
                key={member.person_id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <span className="label-control text-xs text-muted-foreground mr-3">
                    {member.role_title}
                  </span>
                  <span className={`text-sm font-medium ${isMe ? 'text-signal-green' : 'text-foreground'}`}>
                    {isMe ? `${member.person_name} (du)` : member.person_name}
                  </span>
                </div>
                {!isMe && member.phone && (
                  <a
                    href={`tel:${member.phone}`}
                    className="text-pending-amber hover:text-pending-amber/80 transition-colors ml-4"
                    aria-label={`${member.person_name} anrufen`}
                  >
                    📞
                  </a>
                )}
              </div>
            )
          })}
        </div>
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

- [ ] **Schritt 3: Manuell testen**

Dev-Server laufen lassen. Als Freelancer einloggen, auf bestätigtes Event klicken. Erwartung: Call Sheet mit Zeitplan, Venue, Crew und ggf. Notizen. Telefonnummern sind tippbar, Map-Links öffnen Google Maps.

- [ ] **Schritt 4: Commit**

```bash
git add app/\(freelancer\)/events/
git commit -m "feat: add freelancer call sheet page with schedule, venue, and crew"
```

---

## Task 3: Edge Function — send-notification-email

**Files:**
- Create: `supabase/functions/send-notification-email/index.ts`

- [ ] **Schritt 1: Edge Function Verzeichnis und Datei erstellen**

```bash
mkdir -p supabase/functions/send-notification-email
```

Neue Datei `supabase/functions/send-notification-email/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const FROM = Deno.env.get('NOTIFICATION_FROM_EMAIL') ?? 'EventFlow <noreply@example.com>'
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error(`Resend error ${res.status}: ${body}`)
  }
}

async function getPersonEmail(personId: string): Promise<string | null> {
  // persons.email ist gespeichert — direkt aus DB lesen
  const { data } = await supabaseAdmin
    .from('persons')
    .select('email')
    .eq('id', personId)
    .single()
  return data?.email ?? null
}

async function getEventInfo(eventId: string) {
  const { data } = await supabaseAdmin
    .from('events')
    .select('title, phases, venue')
    .eq('id', eventId)
    .single()
  if (!data) return null
  const phases = data.phases as { name: string; startTime: string; endTime: string }[]
  const firstPhase = phases[0]
  const dateStr = firstPhase
    ? new Date(firstPhase.startTime).toLocaleDateString('de-CH', {
        weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : '—'
  const timeStr = firstPhase
    ? new Date(firstPhase.startTime).toLocaleTimeString('de-CH', {
        hour: '2-digit', minute: '2-digit',
      })
    : '—'
  return { title: data.title as string, dateStr, timeStr }
}

async function handleBookingRequest(bookingIds: string[]): Promise<void> {
  for (const bookingId of bookingIds) {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('person_id, role_id, roles!inner(title, event_id)')
      .eq('id', bookingId)
      .single()

    if (!booking) continue

    const roleTitle = (booking as any).roles.title as string
    const eventId = (booking as any).roles.event_id as string
    const email = await getPersonEmail(booking.person_id)
    const eventInfo = await getEventInfo(eventId)

    if (!email || !eventInfo) continue

    const subject = `Neue Anfrage: ${eventInfo.title} · ${eventInfo.dateStr}`
    const html = `
      <p>Hallo,</p>
      <p>Du hast eine neue Buchungsanfrage erhalten:</p>
      <ul>
        <li><strong>Event:</strong> ${eventInfo.title}</li>
        <li><strong>Datum:</strong> ${eventInfo.dateStr} ab ${eventInfo.timeStr} Uhr</li>
        <li><strong>Deine Rolle:</strong> ${roleTitle}</li>
      </ul>
      <p><a href="${Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? 'https://localhost:3000'}/home">Jetzt in der App antworten →</a></p>
    `
    await sendEmail(email, subject, html)
  }
}

async function handleEventCancelled(eventId: string): Promise<void> {
  const eventInfo = await getEventInfo(eventId)
  if (!eventInfo) return

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('person_id, roles!inner(event_id)')
    .eq('status', 'confirmed')
    .eq('roles.event_id', eventId)

  for (const booking of bookings ?? []) {
    const email = await getPersonEmail(booking.person_id)
    if (!email) continue

    const subject = `Event abgesagt: ${eventInfo.title} · ${eventInfo.dateStr}`
    const html = `
      <p>Hallo,</p>
      <p>Leider wurde folgender Event abgesagt:</p>
      <ul>
        <li><strong>Event:</strong> ${eventInfo.title}</li>
        <li><strong>Datum:</strong> ${eventInfo.dateStr}</li>
      </ul>
      <p>Bei Fragen wende dich direkt an den Inhaber.</p>
    `
    await sendEmail(email, subject, html)
  }
}

async function handleDayBeforeReminder(): Promise<void> {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDate = tomorrow.toISOString().slice(0, 10) // YYYY-MM-DD

  // Alle Events laden und filtern nach erstem Phase-Datum = morgen
  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id, title, phases')
    .in('status', ['confirmed', 'booking'])

  const tomorrowEventIds: string[] = []
  for (const event of events ?? []) {
    const phases = event.phases as { startTime: string }[]
    if (phases[0]?.startTime.slice(0, 10) === tomorrowDate) {
      tomorrowEventIds.push(event.id)
    }
  }

  if (tomorrowEventIds.length === 0) return

  for (const eventId of tomorrowEventIds) {
    const eventInfo = await getEventInfo(eventId)
    if (!eventInfo) continue

    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('person_id, roles!inner(title, event_id)')
      .eq('status', 'confirmed')
      .eq('roles.event_id', eventId)

    for (const booking of bookings ?? []) {
      const email = await getPersonEmail(booking.person_id)
      const roleTitle = (booking as any).roles.title as string
      if (!email) continue

      const subject = `Erinnerung morgen: ${eventInfo.title}`
      const html = `
        <p>Hallo,</p>
        <p>Erinnerung: Morgen findet folgender Einsatz statt:</p>
        <ul>
          <li><strong>Event:</strong> ${eventInfo.title}</li>
          <li><strong>Beginn:</strong> ${eventInfo.dateStr} ab ${eventInfo.timeStr} Uhr</li>
          <li><strong>Deine Rolle:</strong> ${roleTitle}</li>
        </ul>
        <p><a href="${Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? 'https://localhost:3000'}/home">Call Sheet öffnen →</a></p>
      `
      await sendEmail(email, subject, html)
    }
  }
}

serve(async (req) => {
  try {
    const { type, bookingIds, eventId } = await req.json()

    if (type === 'booking_request') {
      await handleBookingRequest(bookingIds ?? [])
    } else if (type === 'event_cancelled') {
      await handleEventCancelled(eventId)
    } else if (type === 'day_before_reminder') {
      await handleDayBeforeReminder()
    } else {
      return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-notification-email error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

- [ ] **Schritt 2: NEXT_PUBLIC_SITE_URL als Supabase Secret setzen**

Im Supabase Dashboard → Edge Functions → Secrets:
```
NEXT_PUBLIC_SITE_URL = https://deine-domain.ch
```
(Lokal: `http://localhost:3000` genügt für Tests)

- [ ] **Schritt 3: Edge Function deployen**

```bash
npx supabase functions deploy send-notification-email --project-ref lvdezpdhjnbppphboxyd
```

Erwartete Ausgabe: `Deployed Function send-notification-email`

- [ ] **Schritt 4: Commit**

```bash
git add supabase/functions/
git commit -m "feat: add send-notification-email edge function (Resend)"
```

---

## Task 4: Trigger 1 — E-Mail bei neuer Buchungsanfrage

**Files:**
- Modify: `app/(owner)/events/[id]/actions.ts`

- [ ] **Schritt 1: `sendBookingRequests` um Edge Function-Aufruf erweitern**

Die vollständige `sendBookingRequests`-Funktion in `app/(owner)/events/[id]/actions.ts` ersetzen. Der Insert-Call wird um `.select('id').single()` erweitert, damit die neue Booking-ID direkt zurückkommt — kein zweiter Abfrage-Loop nötig:

```typescript
export async function sendBookingRequests(
  eventId: string,
  assignments: { roleId: string; personId: string }[],
): Promise<{ error: string } | void> {
  const { error, supabase } = await requireOwner()
  if (error || !supabase) return { error: error ?? 'Fehler' }

  if (assignments.length === 0) return { error: 'Keine Zuteilungen vorhanden' }

  const newBookingIds: string[] = []

  for (const { roleId, personId } of assignments) {
    await supabase
      .from('bookings')
      .update({ status: 'declined' })
      .eq('role_id', roleId)
      .eq('status', 'sent')

    const { error: roleError } = await supabase
      .from('roles')
      .update({ assigned_person_id: personId })
      .eq('id', roleId)

    if (roleError) return { error: roleError.message }

    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({ role_id: roleId, person_id: personId, status: 'sent' })
      .select('id')
      .single()

    if (bookingError) return { error: bookingError.message }
    if (newBooking) newBookingIds.push(newBooking.id)
  }

  // Event auf 'booking' setzen falls noch 'draft'
  await supabase
    .from('events')
    .update({ status: 'booking' })
    .eq('id', eventId)
    .eq('status', 'draft')

  if (newBookingIds.length > 0) {
    supabase.functions.invoke('send-notification-email', {
      body: { type: 'booking_request', bookingIds: newBookingIds },
    }).catch(console.error)
  }

  revalidatePath(`/events/${eventId}`)
}
```

- [ ] **Schritt 2: Manuell testen**

Als Owner ein Booking abschicken. Im Supabase Dashboard → Edge Functions → Logs prüfen ob die Funktion aufgerufen wurde. Resend Dashboard prüfen ob die E-Mail ankam.

- [ ] **Schritt 3: Commit**

```bash
git add app/\(owner\)/events/\[id\]/actions.ts
git commit -m "feat: send booking request email via edge function"
```

---

## Task 5: cancelEventAction + Cancel Button (Trigger 2)

**Files:**
- Modify: `app/(owner)/events/[id]/actions.ts`
- Modify: `app/(owner)/events/[id]/page.tsx`
- Create: `app/(owner)/events/[id]/cancel-button.tsx`

- [ ] **Schritt 1: `cancelEventAction` zu actions.ts hinzufügen**

Am Ende von `app/(owner)/events/[id]/actions.ts` anhängen:

```typescript
/**
 * Setzt Event-Status auf 'cancelled' und benachrichtigt alle bestätigten Freelancer per E-Mail.
 */
export async function cancelEventAction(eventId: string): Promise<{ error: string } | void> {
  const { error, supabase } = await requireOwner()
  if (error || !supabase) return { error: error ?? 'Fehler' }

  const { error: dbError } = await supabase
    .from('events')
    .update({ status: 'cancelled' })
    .eq('id', eventId)
    .not('status', 'eq', 'cancelled')

  if (dbError) return { error: dbError.message }

  // E-Mail an bestätigte Crew (fire-and-forget)
  supabase.functions.invoke('send-notification-email', {
    body: { type: 'event_cancelled', eventId },
  }).catch(console.error)

  revalidatePath(`/events/${eventId}`)
}
```

- [ ] **Schritt 2: Cancel Button Client Component erstellen**

Neue Datei `app/(owner)/events/[id]/cancel-button.tsx`:

```tsx
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
```

- [ ] **Schritt 3: Cancel Button in Event Detail Page einbauen**

In `app/(owner)/events/[id]/page.tsx` den Import ergänzen:

```typescript
import { CancelEventButton } from './cancel-button'
```

Im Header-Bereich den `CancelEventButton` neben dem Status-Chip einfügen (nur wenn Status nicht bereits `cancelled` oder `completed`):

```tsx
{/* Im Header, innerhalb des flex items-center gap-3 Containers: */}
{event.status !== 'cancelled' && event.status !== 'completed' && (
  <CancelEventButton eventId={event.id} />
)}
{event.status === 'draft' && <DeleteEventButton eventId={event.id} />}
```

Der vollständige `<div className="flex items-center gap-3">` Block:

```tsx
<div className="flex items-center gap-3">
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass(event.status)}`}
  >
    {statusLabel(event.status)}
  </span>
  {event.status !== 'cancelled' && event.status !== 'completed' && (
    <CancelEventButton eventId={event.id} />
  )}
  {event.status === 'draft' && <DeleteEventButton eventId={event.id} />}
</div>
```

- [ ] **Schritt 4: Manuell testen**

Als Owner auf ein bestätigtes Event navigieren. "Event absagen"-Button klicken, Bestätigung klicken. Erwartung: Status wechselt auf "Abgesagt", Button verschwindet. Im Resend Dashboard prüfen ob E-Mails an bestätigte Crew gesendet wurden.

- [ ] **Schritt 5: Commit**

```bash
git add app/\(owner\)/events/\[id\]/
git commit -m "feat: add cancelEventAction and cancel button with confirmation"
```

---

## Task 6: pg_cron Tag-vorher-Erinnerung (Trigger 3)

**Files:**
- Create: `supabase/migrations/20260408_pg_cron_reminder.sql`

- [ ] **Schritt 1: Migration-Datei erstellen**

Neue Datei `supabase/migrations/20260408_pg_cron_reminder.sql`:

```sql
-- Migration: pg_cron Job für tägliche Tag-vorher-Erinnerung
-- Läuft täglich um 16:00 UTC (= 18:00 MESZ / 17:00 MEZ)
--
-- Voraussetzungen (einmalig im SQL Editor ausführen, falls noch nicht geschehen):
--   ALTER DATABASE postgres SET "app.service_role_key" = 'dein-service-role-key';
--   (Service Role Key: Supabase Dashboard → Settings → API → service_role)

-- pg_net und pg_cron müssen aktiv sein
-- pg_net: Database → Extensions → pg_net
-- pg_cron: wird von Supabase automatisch bereitgestellt

SELECT cron.schedule(
  'eventflow-day-before-reminder',
  '0 16 * * *',
  $$
  SELECT
    net.http_post(
      url        := 'https://lvdezpdhjnbppphboxyd.supabase.co/functions/v1/send-notification-email',
      headers    := jsonb_build_object(
                      'Content-Type',  'application/json',
                      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
                    ),
      body       := '{"type":"day_before_reminder"}'::jsonb
    ) AS request_id
  $$
);
```

- [ ] **Schritt 2: Migration anwenden**

Im Supabase Dashboard → SQL Editor: Inhalt der Migration-Datei einfügen und ausführen.

Erwartung: Kein Fehler. Prüfen:

```sql
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'eventflow-day-before-reminder';
```

Sollte eine Zeile mit dem Job zurückgeben.

- [ ] **Schritt 3: Job manuell triggern (Test)**

Um den Job sofort zu testen (ohne auf 16:00 UTC zu warten), im SQL Editor ausführen:

```sql
SELECT
  net.http_post(
    url        := 'https://lvdezpdhjnbppphboxyd.supabase.co/functions/v1/send-notification-email',
    headers    := jsonb_build_object(
                    'Content-Type',  'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
                  ),
    body       := '{"type":"day_before_reminder"}'::jsonb
  ) AS request_id;
```

Im Edge Function Log (Supabase Dashboard → Edge Functions) prüfen ob der Call ankam. Im Resend Dashboard prüfen ob E-Mails für morgen-Events gesendet wurden (falls vorhanden).

- [ ] **Schritt 4: Commit**

```bash
git add supabase/migrations/20260408_pg_cron_reminder.sql
git commit -m "feat: add pg_cron job for day-before reminder emails"
```

---

## Task 7: Abschluss — Smoke Test & PROGRESS.md

- [ ] **Schritt 1: End-to-End Smoke Test durchführen**

Folgenden Flow manuell testen:

1. Als Owner einloggen, neues Event erstellen (Datum: morgen)
2. Booking starten, Freelancer zuweisen, "Anfragen senden" klicken
   - Prüfen: Freelancer erhält E-Mail (Resend Dashboard)
3. Als Freelancer einloggen, Anfrage bestätigen
4. Als Owner prüfen: Event → confirmed
5. Als Freelancer: Home → bestätigtes Event anklicken → Call Sheet öffnet sich
   - Prüfen: Zeitplan, Venue, Crew (mit tel:-Links), Navigation-Links
6. Als Owner: Event absagen
   - Prüfen: Freelancer erhält Absage-E-Mail
7. pg_cron manuell triggern (SQL aus Task 6 Schritt 3)
   - Falls ein Event morgen stattfindet: Prüfen ob E-Mail ankommt

- [ ] **Schritt 2: PROGRESS.md aktualisieren**

In `PROGRESS.md` den Abschnitt "Offene Pläne" → "Plan 4" auf ✅ setzen und Was-gebaut-wurde eintragen. Analog zu den anderen abgeschlossenen Plänen.

- [ ] **Schritt 3: Final Commit**

```bash
git add PROGRESS.md
git commit -m "docs: mark Plan 4 as complete in PROGRESS.md"
```
