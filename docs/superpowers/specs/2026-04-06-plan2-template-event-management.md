# Plan 2: Template & Event Management

**Datum:** 2026-04-06  
**Status:** Approved  
**Referenz:** `docs/superpowers/specs/2026-04-05-eventflow-design.md` (Gesamtspec)

---

## Kontext

Plan 1 (Foundation) und das Design System sind abgeschlossen. Die Infrastruktur (Supabase, Auth, RLS, Dark Theme) steht. Plan 2 baut die erste echte Funktionalität: der Owner kann Events aus Templates erstellen und verwalten.

---

## Umfang

### Was in Plan 2 gebaut wird

1. **Infrastruktur** — keine UI, aber Voraussetzung für alle folgenden Pläne
2. **Template-Verwaltung** — read-only (kein Erstellen/Bearbeiten von Templates via UI)
3. **Event-Management** — CRUD inkl. Wizard-Erstellung aus Template

### Was explizit NICHT in Plan 2 ist

- Template-Erstellung/-Bearbeitung via UI (manuell via Supabase Dashboard)
- Booking-Workflow (Plan 3)
- Realtime-Updates (Plan 3)
- Freelancer-Ansichten (Plan 3/4)

---

## Infrastruktur

### 1. Supabase TypeScript-Typen

`lib/supabase/types.ts` — generiert via:
```bash
npx supabase gen types typescript --project-id lvdezpdhjnbppphboxyd > lib/supabase/types.ts
```

Repräsentiert das exakte DB-Schema (snake_case). Wird von Mappern konsumiert, nicht direkt in UI-Code.

### 2. Mapper-Utilities (`lib/supabase/mappers.ts`)

Bidirektionale Mapper für alle 5 Tabellen:

| DB (snake_case) | TypeScript (camelCase) |
|---|---|
| `persons` | `Person` |
| `production_templates` | `ProductionTemplate` |
| `events` | `Event` |
| `roles` | `Role` |
| `bookings` | `Booking` |

Jeder Mapper: `fromDb(row): T` und `toDb(obj: T): DbRow`

### 3. Person–User Linking (`app/auth/callback/route.ts`)

Beim ersten Magic-Link Login:
1. Supabase gibt `user` zurück (mit `user.email`)
2. Auth Callback prüft: existiert bereits eine `persons`-Row mit dieser E-Mail und `user_id = null`?
3. Wenn ja: `UPDATE persons SET user_id = user.id WHERE email = user.email`
4. Wenn nein: normale Weiterleitung (Owner hat bereits verknüpfte Person)

---

## Template-Verwaltung (read-only)

### Route: `/templates`

**Datei:** `app/(owner)/templates/page.tsx` (Server Component)

Zeigt alle `production_templates` als Liste:
- Template-Name (z. B. "NL2 Heimspiel EHC Chur")
- Anzahl Rollen (aus `role_templates`)
- Anzahl Phasen
- Link zu Detail

### Route: `/templates/[id]`

**Datei:** `app/(owner)/templates/[id]/page.tsx` (Server Component)

Zeigt Template-Detail:
- Phasen mit Standard-Dauer
- Rollen-Liste mit Titel, Anzahl, Preferred-Persons-Count
- Button: "Event erstellen" → navigiert zu `/events/new?templateId=[id]`

---

## Event-Management

### Dashboard: `/dashboard`

**Datei:** `app/(owner)/dashboard/page.tsx` (Server Component)

Ersetzt den bestehenden Stub. Zeigt:
- Header mit "Neues Event" Button → `/events/new`
- Event-Liste, sortiert nach Datum (nächste zuerst):
  - Event-Titel
  - Datum (erste Phase `startTime`)
  - Status-Chip: draft / booking / confirmed / live / completed / cancelled (Farben: ghost / amber / grün / rot / muted / muted)
  - Link zu Event-Detail

### Event-Erstellung: `/events/new`

**Datei:** `app/(owner)/events/new/page.tsx` (Client Component — Wizard-State)

3-Step Wizard:

**Schritt 1 — Template wählen**
- Liste aller verfügbaren Templates als selektierbare Karten
- "Weiter" aktiviert wenn Template gewählt

**Schritt 2 — Datum & Zeiten**
- Event-Titel (vorausgefüllt: Template-Name + Datum)
- Pro Phase aus dem Template: `startTime` und `endTime` (datetime-local Input)
- Phasen in Reihenfolge, erste Phase setzt den Ton für Folge-Phasen (Vorschlag: Ende = Beginn nächste)
- Validierung: keine Überschneidungen, `endTime > startTime`

**Schritt 3 — Venue bestätigen**
- Venue-Felder aus Template vorausgefüllt: Name, Adresse, GPS, Parking, Access
- Alle Felder editierbar
- "Speichern als Draft" → POST

**Speicher-Logik (Server Action oder Route Handler):**
1. `INSERT INTO events` (title, template_id, status='draft', venue, phases)
2. Für jedes `role_template` mit `count > 1`: `count` × `INSERT INTO roles` (title, event_id)
3. Redirect zu `/events/[id]`

### Event-Detail: `/events/[id]`

**Datei:** `app/(owner)/events/[id]/page.tsx` (Server Component)

Zeigt:
- Event-Titel + Status-Chip
- Phasen-Übersicht (Name, Start, End)
- Venue-Block (Name, Adresse, Parking, Access)
- Rollen-Liste (aus `roles`-Tabelle, alle `open` da Booking noch nicht gestartet)
- "Event löschen" Button (nur bei Status `draft`) — mit Bestätigungsdialog

---

## Datenfluss

```
Server Component (Dashboard/Templates/Event-Detail)
  └── createClient() [server]
      └── Supabase Query (snake_case rows)
          └── mapper.fromDb(row) → TypeScript Domain Object
              └── JSX render

Client Component (Wizard)
  └── React State (multi-step form)
      └── Server Action / fetch POST
          └── createClient() [server-side]
              └── INSERT events + roles
```

---

## Neue Dateien

| Datei | Typ | Zweck |
|---|---|---|
| `lib/supabase/types.ts` | generiert | DB-Typen (snake_case) |
| `lib/supabase/mappers.ts` | neu | Mapper-Funktionen |
| `app/(owner)/templates/page.tsx` | Server Component | Template-Liste |
| `app/(owner)/templates/[id]/page.tsx` | Server Component | Template-Detail |
| `app/(owner)/events/new/page.tsx` | Client Component | Erstellungs-Wizard |
| `app/(owner)/events/[id]/page.tsx` | Server Component | Event-Detail |

## Geänderte Dateien

| Datei | Änderung |
|---|---|
| `app/(owner)/dashboard/page.tsx` | Stub → Event-Liste |
| `app/auth/callback/route.ts` | Person–User Linking hinzufügen |

---

## Verifikation

```bash
npm run dev          # Dashboard zeigt Events, Wizard funktioniert
npm test             # Mapper-Unit-Tests grün
npm run lint         # Keine Lint-Fehler
npm run build        # Production Build erfolgreich
```

Manuelle Checks:
- [ ] Freelancer-Login verknüpft Person mit User (E-Mail-Match)
- [ ] Event aus Template erstellt → korrekte Anzahl `roles` in DB
- [ ] Event-Liste im Dashboard zeigt Status-Chips korrekt
- [ ] Wizard: Venue vorausgefüllt aus Template, editierbar
