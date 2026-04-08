# EventFlow — Progress

## Status: Template Editing abgeschlossen

**Letzter Stand:** 2026-04-08

---

## Abgeschlossene Pläne

### Plan 1: Foundation ✅
Alle 11 Tasks implementiert, reviewed und committed.

**Was gebaut wurde:**
- Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui (default, slate)
- Supabase Projekt: `lvdezpdhjnbppphboxyd` (eu-central-1, Frankfurt)
- Supabase Browser + Server Clients (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
- DB-Schema live: `persons`, `production_templates`, `events`, `roles`, `bookings`
- RLS Policies live (Owner/Freelancer Trennung)
- `proxy.ts` (Next.js 16 Middleware) mit rollenbasiertem Routing
- Auth Callback Route (`/auth/callback`) für Magic Link
- Login-Seite mit Magic Link (`/login`)
- Owner Dashboard Stub (`/dashboard`)
- Freelancer Home Stub (`/home`)
- Domain-Typen (`lib/types.ts`) — 7 Unit-Tests grün
- Seed-Daten live: 8 Personen (1 Owner + 7 Freelancer) + 1 Template "NL2 Heimspiel EHC Chur"
- 4 E2E Smoke-Tests grün (Auth-Redirects)

**Wichtige Next.js 16 Besonderheiten (gelernt in Plan 1):**
- `middleware.ts` → `proxy.ts` mit `export function proxy()`
- Tailwind v4: kein `tailwind.config.ts` — CSS-Variablen in `globals.css`
- `cookies()` aus `next/headers` ist async: `await cookies()`
- `searchParams` in Client Components → `useSearchParams()` + `<Suspense>`

---

## Abgeschlossene Pläne (Fortsetzung)

### Design System: "Kinetic Control Room" ✅
Alle 10 Tasks implementiert, reviewed und committed. Gemergt in `master` am 2026-04-06.

**Was gebaut wurde:**
- Fonts: Space Grotesk (Headlines), Manrope (Body), Space Mono (Technische Daten) via `next/font/google`
- Dark-only Theme: Nocturne `#0e0e13`, Tonal Layers Level 0–3, Ghost Border
- Broadcast-Status-Tokens: Tally-Red `#ff7162`, Signal-Green `#00ff88`, Pending-Amber `#ffb800`
- Utility Classes: `.label-control` (Uppercase, 0.05em), `.data-technical` (Tabular-Nums), `.ghost-border`
- `Button`: Gradient-Variant, Haptic Feedback (`navigator.vibrate(10)`)
- `TallyHeader`: 4px Stripe (live = rot, checked-in = grün)
- `ProductionChip`: Uppercase Chips für Rollen/Skills (EVS, CAM 1, etc.)
- `TopBar`: Glassmorphism Nav (backdrop-blur-24px), sticky
- Login-Seite: Asymmetrisches "Kinetic Control Room" Design
- Alle Layouts auf Dark Theme migriert
- 18 Unit-Tests grün

**Spec:** `Design.md`  
**Plan:** `docs/superpowers/plans/2026-04-05-design-system.md`

---

### Plan 2: Template & Event Management ✅
Alle 12 Tasks implementiert, reviewed und committed. Feature-Branch: `feature/plan2-template-events`

**Was gebaut wurde:**
- `lib/supabase/types.ts` — generierte DB-Typen via Supabase CLI
- `lib/supabase/mappers.ts` — Mapper für alle 5 Tabellen (snake_case → camelCase), 5 Unit-Tests
- `lib/auth-linking.ts` — `linkPersonToUser()`: verknüpft Freelancer-Login mit persons-Row, 3 Unit-Tests
- `lib/events.ts` — `materializeRoles()`: erstellt Role-Rows aus RoleTemplates, 3 Unit-Tests
- `app/auth/callback/route.ts` — erweitert mit Person-User-Linking beim ersten Login
- `app/(owner)/layout.tsx` — Nav-Links (Dashboard / Templates) in TopBar
- `app/(owner)/dashboard/page.tsx` — Event-Liste mit Status-Chips (draft/booking/confirmed/live/completed/cancelled)
- `app/(owner)/templates/page.tsx` — Template-Liste (read-only)
- `app/(owner)/templates/[id]/page.tsx` — Template-Detail mit Phasen und Rollen
- `app/(owner)/events/new/page.tsx` + `wizard.tsx` — 3-Step Event-Erstellungs-Wizard
- `app/(owner)/events/new/actions.ts` — Server Action: Event + Roles in DB speichern
- `app/(owner)/events/[id]/page.tsx` — Event-Detail mit Zeitplan, Venue, Rollen

**Total: 29 Unit-Tests grün (inkl. 11 neue aus Plan 2)**

---

### Plan 3: Booking Flow + Dashboard ✅
Alle 6 Tasks implementiert, E2E Smoke Test bestanden. Abgeschlossen: 2026-04-08

**Was gebaut wurde:**
- `lib/bookings.ts` — Pure Helpers: `getRoleBookingStatus()`, `checkAllRolesConfirmed()`, 10 Unit-Tests
- `lib/bookings-server.ts` — `transitionEventStatus()` (server-only, Supabase-Zugriff)
- `app/(owner)/events/[id]/actions.ts` — 3 neue Server Actions: `startBookingAction`, `sendBookingRequests`, `replaceBookingAction`
- `app/(owner)/events/[id]/booking-section.tsx` — Client Component mit Realtime, Rollen-Picker, Status-Chips, Replace-Flow
- `app/(owner)/events/[id]/page.tsx` — erweitert mit Booking-Daten, busyPersonIds, `<BookingSection>`
- `app/(freelancer)/actions.ts` — `respondToBookingAction` mit automatischem Event-Status-Übergang
- `app/(freelancer)/home/booking-requests.tsx` — Client Component für Anfragen (accept/decline)
- `app/(freelancer)/home/page.tsx` — Offene Anfragen + bestätigte Events

**RLS-Fixes (während Smoke Test entdeckt):**
- Rekursion zwischen `events`- und `roles`-Policies → behoben via `SECURITY DEFINER`-Funktionen (`my_confirmed_event_ids`, `my_booked_event_ids`)
- `freelancer_booked_events`-Policy auf `sent` + `confirmed` erweitert (Freelancer braucht Event-Zugriff für pending Anfragen)
- `allow_self_link`-Policy auf `persons` für Auth-Linking beim ersten Login

**Dev-Hilfsdateien (nicht für Produktion):**
- `app/api/dev-login/route.ts` — Generiert Login-Link via Admin API (umgeht Rate Limit)
- `app/auth/dev-callback/page.tsx` — Implicit Flow Handler für Dev-Login
- `scripts/generate-login-link.mjs` — CLI-Script für Login-Link

**Total: 39 Unit-Tests grün**

---

### Plan 4: Call Sheet + Email Notifications ✅
Alle Tasks implementiert, Smoke Test bestanden, in master gemergt: 2026-04-08

**Was gebaut wurde:**
- `app/(freelancer)/call-sheet/[id]/page.tsx` — Mobile Call Sheet mit Zeitplan, Venue, Crew-Liste, Navigation
- `supabase/functions/send-notification-email/` — Edge Function für Booking-Request E-Mails (Resend)
- `app/(owner)/events/[id]/cancel-button.tsx` — Cancel-Event für Owner
- `app/(owner)/events/[id]/actions.ts` — `cancelEventAction`, erweitertes `sendBookingRequests` mit E-Mail
- `supabase/migrations/20260408120000_pg_cron_reminder.sql` — Tag-vorher-Erinnerung via pg_cron
- `get_confirmed_crew` SQL-Funktion (SECURITY DEFINER) für Crew-Zugriff im Call Sheet
- Routing-Fix: Call Sheet auf `/call-sheet/[id]` (Konflikt mit Owner `/events/[id]` gelöst)

**E-Mail-Setup (manuell ausstehend für Produktion):**
- Resend API Key als Supabase Secret setzen
- pg_net Extension aktivieren
- Service Role Key als DB-Setting
- pg_cron Migration ausführen

**Total: 39 Unit-Tests grün**

---

### Template Editing ✅
Alle 6 Tasks implementiert, reviewed und in master gemergt: 2026-04-08

**Was gebaut wurde:**
- `app/(owner)/templates/[id]/inline-editor.tsx` — Client Component mit View/Edit-Toggle, Inline-Formular für alle Felder
- `app/(owner)/templates/[id]/actions.ts` — `updateTemplateAction` mit Validierung und Owner-Auth
- `app/(owner)/templates/new/page.tsx` — Neue Template-Seite (leer oder als Duplikat via `?from=[id]`)
- `app/(owner)/templates/new/actions.ts` — `createTemplateAction` mit Redirect zu neuem Template
- `app/(owner)/templates/[id]/page.tsx` — Auf minimale Server Component reduziert
- `app/(owner)/templates/page.tsx` — «+ Neues Template»-Button + «Duplizieren»-Link pro Zeile

**Total: 39 Unit-Tests grün**

---

## Offene Pläne

Keine offenen Pläne.

---

## Deployment

- **Produktion:** https://event-flow-chi.vercel.app
- **Hosting:** Vercel (Hobby Plan, public repo)
- **Live seit:** 2026-04-08

## Supabase

- **Projekt-ID:** `lvdezpdhjnbppphboxyd`
- **Region:** eu-central-1 (Frankfurt)
- **URL:** `https://lvdezpdhjnbppphboxyd.supabase.co`
- **Migrationen angewendet:** `initial_schema`, `rls_policies`
- **Seed-Daten:** eingespielt (Crew-Pool EHC Chur + NL2 Template)

## Specs & Pläne

- Spec: `docs/superpowers/specs/2026-04-05-eventflow-design.md`
- Plan 1: `docs/superpowers/plans/2026-04-05-foundation.md`
