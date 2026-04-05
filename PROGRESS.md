# EventFlow — Progress

## Status: Plan 1 (Foundation) abgeschlossen

**Letzter Stand:** 2026-04-05

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

## Offene Pläne

### Plan 2: Template & Event Management (ausstehend)
Nächste Schritte:
- `lib/supabase/types.ts` generieren via `npx supabase gen types typescript --project-id lvdezpdhjnbppphboxyd`
- DB↔TypeScript Mapper (snake_case → camelCase) in `lib/supabase/mappers.ts`
- Person–User Verknüpfung beim ersten Freelancer-Login (Auth Callback erweitern)
- CRUD für `production_templates` (Owner-Seite)
- CRUD für `events` aus Templates (Owner-Seite)

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
