# EventFlow — Roadmap

Alle 4 Basispläne sind abgeschlossen. Diese Roadmap beschreibt mögliche nächste Schritte.

---

## Produktionsbereit machen

Kleine, konkrete Schritte bevor die App produktiv genutzt wird:

- **E-Mail-Setup abschliessen** — Resend API Key, pg_net, pg_cron für Booking-Anfragen und Tag-vorher-Erinnerung
- **Deployment** — Vercel (empfohlen für Next.js), Supabase Prod-Umgebung trennen
- **Freelancer-Onboarding** — Einladungslinks für die 15–20 Techniker generieren und versenden

---

## Plan 5: Push Notifications (PWA)

Die App ist bereits als PWA konzipiert. Web Push würde E-Mail als primären Notification-Kanal ablösen.

- Web Push API via Service Worker
- Supabase Edge Function: Push bei neuer Buchungsanfrage
- Fallback auf E-Mail für Geräte ohne Push-Support
- Opt-in in Freelancer-Einstellungen

---

## Plan 6: PDF Call Sheet

Call Sheet als herunterladbares / druckbares PDF.

- Serverseitig via `@react-pdf/renderer` oder Puppeteer
- Button im Call Sheet View: "PDF herunterladen"
- Nützlich für Produktionen ohne Mobilempfang (Eisstadion)

---

## Plan 7: People-Verwaltung

Die `/people`-Seite wurde in Plan 2 bewusst zurückgestellt.

- Freelancer-Liste mit Kontaktdaten für den Owner
- Freelancer bearbeiten (Name, Telefon, Skills)
- Neue Freelancer einladen (Magic Link generieren + versenden)
- Skill-Tags für Rollenfilterung (EVS, CAM, Ton, etc.)

---

## Plan 8: Kalender-Sync

In der Design-Spec explizit als "spätere Version" vorgesehen.

- iCal-Export für Freelancer (Event in Kalender importieren)
- Google Calendar Integration
- Automatisch beim Event-Confirm

---
## Plan 9: Freelancer-seitige Verfügbarkeitskalender

## Bewusst nicht geplant

Gemäss ursprünglicher Design-Entscheidung ausgeschlossen:


- Automatische Eskalation bei Absagen
- Rechnungs- / Honorarverwaltung
- Native iOS/Android App (PWA ist ausreichend)
