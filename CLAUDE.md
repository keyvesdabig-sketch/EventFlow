# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**EventFlow** — Internes Personal-Planungstool für Sport-Streaming-Produktionen (EHC Chur, Swiss League NL2 Eishockey). Verwaltet Freelancer-Buchungen, Event-Planung und mobile Call Sheets für einen Pool von 15–20 Technikern.

Vollständige Spezifikation: `docs/superpowers/specs/2026-04-05-eventflow-design.md`  
Implementierungspläne: `docs/superpowers/plans/`

## Stack

- **Framework:** Next.js 14 (App Router), TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend/DB:** Supabase (Postgres, Auth, Realtime)
- **Unit Tests:** Vitest + React Testing Library
- **E2E Tests:** Playwright

## Commands

```bash
npm run dev          # Dev-Server starten (http://localhost:3000)
npm run build        # Production Build
npm run lint         # ESLint
npm test             # Vitest unit tests (einmalig)
npm run test:watch   # Vitest im Watch-Modus
npm run test:e2e     # Playwright E2E (benötigt laufenden Dev-Server)
npx vitest run tests/unit/types.test.ts   # Einzelnen Test ausführen
npx playwright test tests/e2e/auth.spec.ts  # Einzelne E2E-Spec ausführen
```

Supabase-Typen nach Schema-Änderungen neu generieren:
```bash
npx supabase gen types typescript --project-id DEIN-PROJEKT-ID > lib/supabase/types.ts
```

## Architektur

### Route-Gruppen (App Router)

```
app/
├── (auth)/login/        # Magic-Link Login, kein Nav
├── (owner)/dashboard/   # Geschützt: nur role='owner'
├── (freelancer)/home/   # Geschützt: nur role='freelancer'
├── auth/callback/       # Supabase OAuth Callback
└── page.tsx             # Root: Redirect basierend auf Rolle
```

`middleware.ts` schützt alle Routen und leitet basierend auf `persons.role` weiter.

### Zwei Nutzerrollen

- **Owner** (Inhaber, 1 Person): plant Events, bucht Crew, sieht Dashboard — primär Desktop
- **Freelancer** (15–20 Personen): beantwortet Anfragen, konsumiert Call Sheet — primär Mobile

### Datenmodell

Fünf Kerntabellen in Supabase:

```
persons            → Freelancer + Owner (verknüpft mit auth.users via user_id)
production_templates → Wiederverwendbare Vorlagen mit Rollen und Phasen
events             → Konkrete Produktionen (Snapshot eines Templates)
roles              → Zu besetzende Stellen innerhalb eines Events
bookings           → Anfrage/Antwort-Datensatz zwischen Person und Role
```

**Buchungs-Status-Logik:** Der effektive Buchungsstatus einer `role` wird aus dem aktiven `booking`-Datensatz abgeleitet (nicht redundant gespeichert). Kein Booking = `open`, `booking.status='sent'` = `requested`, etc.

**Event-Status-Flow:** `draft → booking → confirmed → live → completed` (jederzeit: `→ cancelled`)

### Supabase-Clients

- `lib/supabase/client.ts` — Browser-Client (für `'use client'`-Komponenten)
- `lib/supabase/server.ts` — Server-Client (für Server Components, Route Handlers, Middleware)

Nie den Browser-Client in Server Components verwenden.

### DB-Feldnamen

Datenbank verwendet `snake_case`, TypeScript-Typen in `lib/types.ts` verwenden `camelCase`. Mapper-Funktionen liegen in `lib/supabase/mappers.ts` (ab Plan 2).

### RLS

Row Level Security ist aktiv. Owner hat vollen Zugriff. Freelancer sieht nur eigene `person`, eigene `bookings` und `events` wo eine bestätigte Buchung vorliegt. Helper-Funktionen `is_owner()` und `my_person_id()` sind als Postgres-Functions definiert.

## Implementierungs-Reihenfolge

Plan 1 (Foundation) → Plan 2 (Template & Event Management) → Plan 3 (Booking Flow + Dashboard) → Plan 4 (Call Sheet + Notifications)
