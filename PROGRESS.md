# EventFlow — Progress

## Status: Plan 2 (Template & Event Management) abgeschlossen

**Letzter Stand:** 2026-04-06

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

## Offene Pläne

### Plan 3: Booking Flow + Dashboard (ausstehend)
- Anfragen senden (Owner → Freelancer)
- Bestätigen/Ablehnen (Freelancer)
- Live-Status-Dashboard (Inhaber)
- Supabase Realtime für Dashboard-Updates

### Plan 4: Call Sheet + Notifications (ausstehend)
- Mobile Call Sheet View (Freelancer)
- Push Notifications (Web Push API via Supabase Edge Functions)
- PDF-Export des Call Sheets

---

## Supabase

- **Projekt-ID:** `lvdezpdhjnbppphboxyd`
- **Region:** eu-central-1 (Frankfurt)
- **URL:** `https://lvdezpdhjnbppphboxyd.supabase.co`
- **Migrationen angewendet:** `initial_schema`, `rls_policies`
- **Seed-Daten:** eingespielt (Crew-Pool EHC Chur + NL2 Template)

## Specs & Pläne

- Spec: `docs/superpowers/specs/2026-04-05-eventflow-design.md`
- Plan 1: `docs/superpowers/plans/2026-04-05-foundation.md`
