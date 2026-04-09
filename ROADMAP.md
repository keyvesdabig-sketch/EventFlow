# EventFlow — Roadmap

Alle 4 Basispläne sind abgeschlossen. Die App ist live. Diese Roadmap beschreibt die nächsten Schritte geordnet nach Priorität.

---

## Owner Briefing

Anleitung für den Inhaber: `docs/OWNER_BRIEFING.md`  
Enthält: Workflows, Login, Freelancer-Onboarding. Technischer Betrieb bleibt beim Entwickler.

---

## Aktueller Stand (2026-04-09)

Die App läuft produktiv auf https://event-flow-chi.vercel.app.  
Nächstes echtes Event in < 2 Wochen — Fokus auf Stabilität und Einsatzbereitschaft.

---

## 🔴 Sofort (vor erstem echten Event)

### People-Verwaltung (`/people`) — nächster Plan
Die Datenbank enthält nur Dummy-Einträge. Ohne echte E-Mails können keine Booking-Anfragen zugestellt werden.

- Freelancer-Liste für den Owner (Name, E-Mail, Telefon, Skills)
- Inline-Bearbeitung bestehender Personen
- Neue Freelancer einladen (Magic Link generieren)

### P1-Bug: Event Wizard Phasen-Datum
Codex Review gefunden: Überlappende Phasen werden auf falsches Datum verschoben.
Betroffene Datei: `app/(owner)/events/new/wizard.tsx:120-131`

### End-to-End Smoke Test
1 Freelancer mit echten Daten einladen → kompletten Booking-Zyklus durchspielen.

---

## 🟡 Nach dem ersten Event (kein Termin-Druck)

### Plan 5: Push Notifications (PWA)
Web Push würde E-Mail als primären Notification-Kanal ablösen.
- Web Push API via Service Worker
- Supabase Edge Function: Push bei neuer Buchungsanfrage
- Fallback auf E-Mail für Geräte ohne Push-Support
- Opt-in in Freelancer-Einstellungen

### Plan 6: PDF Call Sheet
Call Sheet als herunterladbares / druckbares PDF.
- Serverseitig via `@react-pdf/renderer` oder Puppeteer
- Button im Call Sheet View: "PDF herunterladen"
- Nützlich für Produktionen ohne Mobilempfang (Eisstadion)

### Plan 8: Kalender-Sync
In der Design-Spec explizit als "spätere Version" vorgesehen.
- iCal-Export für Freelancer (Event in Kalender importieren)
- Google Calendar Integration
- Automatisch beim Event-Confirm

---

## 🔵 Längerfristig

### Plan 7: People-Verwaltung erweitert
Nach der Basis-Implementation:
- Skill-Tags für Rollenfilterung (EVS, CAM, Ton, etc.)
- Verfügbarkeitskalender pro Freelancer

### Plan 9: Freelancer-seitige Verfügbarkeitskalender

---

## Abgeschlossen ✅

| Was | Wann |
|---|---|
| E-Mail-Setup (Resend, pg_net, pg_cron) | 2026-04-09 |
| UI/UX Polishing & Workflow Shortcuts | 2026-04-08 |
| Template Editing | 2026-04-08 |
| Plan 4: Call Sheet + Email Notifications | 2026-04-08 |
| Plan 3: Booking Flow + Dashboard | 2026-04-08 |
| Plan 2: Template & Event Management | 2026-04-07 |
| Design System "Kinetic Control Room" | 2026-04-06 |
| Plan 1: Foundation | 2026-04-05 |

---

## Bewusst nicht geplant

- Automatische Eskalation bei Absagen
- Rechnungs- / Honorarverwaltung
- Native iOS/Android App (PWA ist ausreichend)
