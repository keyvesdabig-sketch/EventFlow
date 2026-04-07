# Plan 3: Booking Flow + Dashboard
**Datum:** 2026-04-07  
**Status:** Design genehmigt  
**Vorgänger:** Plan 2 (Template & Event Management)

---

## 1. Ziel

Den Buchungsprozess end-to-end implementieren: Owner weist Rollen Personen zu und sendet Anfragen; Freelancer sieht Anfragen und antwortet; Owner sieht Live-Status via Supabase Realtime.

Keine Push-Notifications in diesem Plan (folgt Plan 4). Freelancer checkt App manuell.

---

## 2. Scope

### In Plan 3 enthalten
- Owner: Inline-Rollenzuteilung im Event-Detail (Person-Picker)
- Owner: Anfragen senden (Server Action, erstellt `bookings`-Rows)
- Owner: Live-Status-Anzeige pro Rolle (Supabase Realtime)
- Owner: Ersetzen einer abgesagten Rolle
- Auto-Transition Event-Status → `confirmed` wenn alle Rollen bestätigt
- Freelancer: Offene Anfragen sehen und beantworten (zusagen/ablehnen)
- Freelancer: Liste bestätigter Events

### Explizit ausgeschlossen (folgt Plan 4)
- Push Notifications / E-Mail bei neuen Anfragen
- Call Sheet View
- Realtime auf Freelancer-Seite

---

## 3. Datenmodell

Keine Schema-Änderungen — alle Tabellen existieren:

```
roles.assigned_person_id   → wird gesetzt wenn Owner Person wählt
bookings.status            → 'sent' | 'confirmed' | 'declined'
bookings.decline_reason    → optionaler Freitext bei Ablehnung
events.status              → auto-transition zu 'confirmed' wenn alle Rollen confirmed
```

**Booking-Status-Ableitung pro Rolle:**
- Kein Booking → `open`
- `bookings.status = 'sent'` → `requested`
- `bookings.status = 'confirmed'` → `confirmed`
- `bookings.status = 'declined'` → `declined` (→ neues Booking möglich)

---

## 4. Owner: Booking Flow (Event-Detail)

### 4.1 Einstieg

Event-Detail-Seite (`/events/[id]`) erhält am Ende der Rollen-Sektion kontextabhängiges UI:

- **Status `draft`:** Button "Booking starten" → Server Action setzt `events.status = 'booking'`
- **Status `booking` / `confirmed`:** Interaktive Booking-Sektion (Client Component)

### 4.2 Booking-Sektion (`booking-section.tsx`)

Client Component. Erhält als Props: `roles[]`, `persons[]` (Pool), `bookings[]`, `templatePreferences` (preferredPersonIds pro Rolle).

**Pro Rolle:**
```
[EVS-Operator]                          [Angefragt ●]
  Empfehlungen: [Max M.] [Sara B.] [Urs C.]
  [Andere wählen ▼]
    → Inline-Expand: Skill-Filter-Chips + Personenliste
```

- Bis zu 3 bevorzugte Personen aus Template als 1-Klick-Chips
- Chip-Status: neutral / ausgewählt (grün) / Konflikt (roter Rand = Person hat `confirmed` Booking in einem anderen Event, dessen erste Phase am gleichen Kalendertag liegt)
- "Andere wählen ▼": klappt auf, zeigt Skill-Filter-Chips (camera, evs, audio, …) + gefilterte Personenliste
- Gewählte Person: hervorgehoben, Chip zeigt Häkchen
- Client-side State für alle Auswahlen (kein DB-Write bis "Anfragen senden")

**Unten:**
- Button **"Anfragen senden"** (aktiv sobald mind. 1 Rolle eine Person zugewiesen hat)

### 4.3 Server Action: `sendBookingRequests`

```typescript
sendBookingRequests(eventId: string, assignments: { roleId: string; personId: string }[])
```

Für jede Assignment:
1. `roles` UPDATE: `assigned_person_id = personId`
2. Vorherige offene Bookings für diese Rolle auf `declined` setzen (falls vorhanden)
3. `bookings` INSERT: `{ role_id, person_id, status: 'sent', requested_at: now() }`
4. `events` UPDATE: `status = 'booking'` (falls noch `draft`)

### 4.4 Live-Status nach dem Senden

Die Booking-Sektion zeigt nach dem Senden den Echtzeit-Status:

```
EVS-Operator    Max Müller    [Zugesagt ✓]
Kameramann 1   Sara Bauer    [Angefragt ●]
Toningenieur   Tom Keller    [Abgesagt ✗]  [Jetzt ersetzen →]
Bildmischer    Urs Caflisch  [Angefragt ●]
```

- "Jetzt ersetzen": öffnet den Inline-Picker für diese Rolle erneut
- Replace-Action erstellt neues Booking (altes bleibt als Historie)

### 4.5 Supabase Realtime

`booking-section.tsx` abonniert den `bookings`-Channel:

```typescript
supabase
  .channel(`event-bookings-${eventId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'bookings',
    filter: `role_id=in.(${roleIds.join(',')})`
  }, handleBookingChange)
  .subscribe()
```

Bei jeder Änderung: lokalen State aktualisieren → UI re-rendert.

### 4.6 Auto-Transition zu `confirmed`

Nach jedem Realtime-Update: prüfen ob alle Rollen des Events `confirmed`. Falls ja:
- Server Action `transitionEventStatus(eventId, 'confirmed')` aufrufen

`transitionEventStatus` lebt in `lib/bookings.ts` als shared Helper (wird von Owner- und Freelancer-`actions.ts` importiert):
```typescript
async function transitionEventStatus(eventId: string, status: EventStatus): Promise<void>
```

### 4.7 Server Action: `replaceBooking`

```typescript
replaceBooking(roleId: string, newPersonId: string)
```

1. Aktives Booking der Rolle: kein Update nötig (Status bleibt als Historie)
2. `roles` UPDATE: `assigned_person_id = newPersonId`
3. `bookings` INSERT: neues Booking mit `status: 'sent'`

---

## 5. Freelancer: Home (`/home`)

Server Component. Lädt beim Öffnen der App — kein Realtime (Plan 4).

### 5.1 Sektion "Offene Anfragen"

Query: `bookings` WHERE `person_id = my_person_id()` AND `status = 'sent'`, JOIN `roles`, `events`.

Pro Anfrage-Karte:
```
NL2 · EHC Chur vs. HC Davos
Sa, 12. Apr · EVS-Operator
Rigging 08:00 – Live 22:00

[  ZUSAGEN  ]    [ Ablehnen ]
```

"Ablehnen" klappt inline ein optionales Freitext-Feld auf:
```
Grund (optional): [________________________]
                  [ Ablehnen bestätigen ]
```

### 5.2 Server Action: `respondToBooking`

```typescript
respondToBooking(bookingId: string, response: 'confirmed' | 'declined', declineReason?: string)
```

1. `bookings` UPDATE: `status = response`, `responded_at = now()`, `decline_reason` (falls vorhanden)
2. Falls `confirmed`: prüfen ob alle Rollen des Events confirmed → ggf. `transitionEventStatus`
3. `revalidatePath('/home')`

### 5.3 Sektion "Meine Events"

Query: `bookings` WHERE `person_id = my_person_id()` AND `status = 'confirmed'`, JOIN `roles`, `events`. Sortiert nach erstem Phasen-Startdatum aufsteigend.

Pro Eintrag: Event-Titel, Datum, Rolle, Venue-Name. Kein Link (kein Call Sheet in Plan 3).

---

## 6. Dateien-Übersicht

### Neue Dateien

| Datei | Typ | Zweck |
|-------|-----|-------|
| `app/(owner)/events/[id]/booking-section.tsx` | Client Component | Realtime, Role-Picker, Status-Anzeige |
| `app/(owner)/events/[id]/actions.ts` | Server Actions | `sendBookingRequests`, `replaceBooking`, `transitionEventStatus` |
| `app/(freelancer)/home/booking-requests.tsx` | Client Component | Zusagen/Ablehnen mit inline Ablehnungsgrund |
| `app/(freelancer)/actions.ts` | Server Actions | `respondToBooking` |
| `lib/bookings.ts` | Query-Helpers + shared Action | `getBookingsForEvent`, `getBookingsForPerson`, `getRoleBookingStatus`, `transitionEventStatus` |

### Geänderte Dateien

| Datei | Änderung |
|-------|---------|
| `app/(owner)/events/[id]/page.tsx` | Booking-Sektion einbinden, Persons + Bookings laden |
| `app/(freelancer)/home/page.tsx` | Stub ersetzen durch echte Anfragen + Events |

---

## 7. Entscheidungen & Begründungen

| Entscheidung | Begründung |
|-------------|------------|
| Booking inline im Event-Detail (kein separater Screen) | Weniger Navigation, Kontext bleibt sichtbar |
| "Andere wählen" als Inline-Expand (kein Modal) | Kein Fokus-Trap, alle Rollen bleiben sichtbar |
| Realtime nur auf Owner Event-Detail | Einziger echter Use Case; Freelancer-Pool klein genug für manuelles Refresh |
| Client-side State bis "Anfragen senden" | Atomares Senden, keine halbfertigen Bookings in DB |
| Keine Push-Notifications in Plan 3 | Implementierungskomplexität in Plan 4 isoliert (Web Push API) |
