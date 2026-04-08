# EventFlow Plan 4 — Call Sheet & E-Mail Notifications

**Datum:** 2026-04-08  
**Status:** Spec (bereit für Implementierungsplan)

---

## 1. Scope

Plan 4 baut zwei neue Features:

1. **Freelancer Call Sheet** — dedizierte Detailseite für bestätigte Events
2. **E-Mail Notifications** — 3 Auslöser via Supabase Edge Function + Resend

Explizit **nicht** in Plan 4:
- PDF-Export (auf später verschoben)
- Web Push / Service Worker (auf später verschoben)
- Event bearbeiten / Datum ändern (auf später verschoben)

---

## 2. Call Sheet (Freelancer)

### Neue Route

```
app/(freelancer)/events/[id]/page.tsx
```

Server Component. RLS stellt sicher, dass der Freelancer nur Events sieht, für die er eine bestätigte Buchung hat.

### Navigation

Auf der Freelancer-Home (`/home`) werden bestätigte Event-Karten in anklickbare Links umgewandelt (`/events/[id]`). Kein neuer Tab. TopBar zeigt einen Zurück-Pfeil.

### Layout — Langer Scroll

Alle Informationen auf einer Seite, von oben nach unten:

```
── HEADER ────────────────────────────
  NL2 · BESTÄTIGT
  EHC Chur vs. HC Davos
  Sa, 12. Apr 2026 · Deine Rolle: EVS-Operator

── ZEITPLAN ──────────────────────────
  08:00  Rigging-Beginn
  12:00  Rehearsal
  15:30  Sendebeginn (Live)          ← Live-Phase farblich hervorgehoben
  22:00  Abbau / Ende

── VENUE ─────────────────────────────
  Eissportzentrum Chur
  Güterstrasse 5, 7000 Chur
  Eingang Nord, Tor B (Ü-Wagen)
  [↗ Karte öffnen]   [↗ GPS-Navigation]

── CREW ──────────────────────────────
  Kameramann 1   Max Müller    [📞]
  Kameramann 2   Lena Graf     [📞]
  EVS-Operator   (du)
  Toningenieur   Sara Bauer    [📞]
  Bildmischer    Tom Keller    [📞]

── NOTIZEN ───────────────────────────
  [Freitext aus events.notes]
```

### Datenquellen

| Inhalt | Quelle |
|--------|--------|
| Event-Titel, Status, Notizen | `events` |
| Phasen mit Zeiten | `events.phases` (JSONB) |
| Venue-Daten | `events.venue` (JSONB) |
| Eigene Rolle | `roles` via bestätigtes `booking` |
| Crew | Alle `bookings` mit `status='confirmed'` desselben Events + `persons` |

### UX-Details

- **Telefonnummern:** als `tel:`-Links gerendert → natives Wählen auf Mobile
- **GPS-Link:** `https://maps.google.com/?q=<lat>,<lng>` (fällt auf Adress-String zurück wenn kein GPS)
- **Live-Phase:** Farbe `#ff7162` (Tally-Red) für die Live-Phase im Zeitplan
- **Notizen-Sektion:** nur anzeigen wenn `events.notes` nicht leer
- **Crew ohne Telefon:** kein 📞-Icon, kein leerer Platzhalter

---

## 3. E-Mail Notifications

### Architektur

```
Auslöser (Server Action / pg_cron)
  → HTTP POST → Supabase Edge Function "send-notification-email"
    → Resend API
      → E-Mail an Freelancer
```

Die Edge Function ist generisch und empfängt `{ type, eventId, personIds?, ... }`. Sie lädt die nötigen Daten selbst aus der DB (via Supabase Admin Client) und baut die E-Mail.

### E-Mail Provider: Resend

- Gratis bis 3.000 Mails/Monat
- API-Key als Supabase Secret gespeichert (`RESEND_API_KEY`)
- Absender-Domain muss bei Resend verifiziert werden (einmalig)
- Fallback: Supabase SMTP (nur für Entwicklung/Tests)

### Trigger 1 — Neue Buchungsanfrage

| | |
|--|--|
| **Auslöser** | Owner klickt "Anfragen senden" in BookingSection |
| **Wo im Code** | Bestehende `sendBookingRequests` Server Action (`app/(owner)/events/[id]/actions.ts`) |
| **Empfänger** | Alle neu angefragten Freelancer (1 Mail pro Person) |
| **Betreff** | `Neue Anfrage: [Event-Titel] · [Datum]` |
| **Inhalt** | Event-Titel, Datum, Rolle, Link zur App (`/home`) |

### Trigger 2 — Event abgesagt

| | |
|--|--|
| **Auslöser** | Owner setzt Event-Status auf `cancelled` |
| **Wo im Code** | Neue `cancelEventAction` in `app/(owner)/events/[id]/actions.ts` |
| **Owner-UI** | Cancel-Button auf der Event-Detail-Seite (Owner), mit Bestätigungs-Dialog |
| **Empfänger** | Alle Freelancer mit `booking.status='confirmed'` für dieses Event |
| **Betreff** | `Event abgesagt: [Event-Titel] · [Datum]` |
| **Inhalt** | Event-Titel, Datum, kurze Hinweiszeile |

### Trigger 3 — Tag-vorher-Erinnerung

| | |
|--|--|
| **Auslöser** | pg_cron-Job täglich um 16:00 UTC (= 18:00 MESZ / 17:00 MEZ) |
| **Wo im Code** | Supabase-Migration (pg_cron + `net.http_post`) |
| **Empfänger** | Alle Freelancer mit `booking.status='confirmed'` für Events die morgen beginnen |
| **Betreff** | `Erinnerung morgen: [Event-Titel]` |
| **Inhalt** | Event-Titel, Datum, Uhrzeit, Rolle, Link zur App |
| **Duplikat-Schutz** | Abfrage auf `phases[0].start_time` — nur Events die am morgigen Kalendertag beginnen |

### Edge Function Interface

```typescript
// Payload für Trigger 1
{ type: 'booking_request', bookingIds: string[] }

// Payload für Trigger 2
{ type: 'event_cancelled', eventId: string }

// Payload für Trigger 3 (aufgerufen von pg_cron)
{ type: 'day_before_reminder', eventIds: string[] }
```

Die Edge Function lädt intern alle nötigen Daten (Personen-Emails, Event-Details) via Supabase Admin Client.

---

## 4. Neue Datenbankänderungen

Keine neuen Tabellen. Bestehende Struktur reicht aus.

Neue Supabase-Migration für pg_cron:
```sql
-- Aktiviert pg_cron Extension (falls nicht aktiv)
-- Registriert täglichen Job um 16:00 UTC (= 18:00 MESZ / 17:00 MEZ)
SELECT cron.schedule(
  'day-before-reminder',
  '0 18 * * *',
  $$ SELECT net.http_post(...) $$
);
```

---

## 5. Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `app/(freelancer)/events/[id]/page.tsx` | Call Sheet Server Component |
| `supabase/functions/send-notification-email/index.ts` | Edge Function (generisch) |
| `supabase/migrations/YYYYMMDD_pg_cron_reminder.sql` | pg_cron Job Registration |

### Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `app/(freelancer)/home/page.tsx` | Bestätigte Event-Karten → anklickbar |
| `app/(owner)/events/[id]/actions.ts` | `sendBookingRequests`: Edge Function aufrufen; neue `cancelEventAction` |
| `app/(owner)/events/[id]/page.tsx` | Cancel-Button + Bestätigungs-Dialog |

---

## 6. Nicht in Scope (explizit)

- PDF-Export
- Web Push / Service Worker / Browser-Permission
- Event-Zeiten nachträglich bearbeiten
- Notification wenn alle Rollen bestätigt (Owner)
- `/people` Freelancer-Pool-Verwaltung
