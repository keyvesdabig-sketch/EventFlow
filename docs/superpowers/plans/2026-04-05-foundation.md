# EventFlow — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lauffähiges Next.js-Projekt mit Supabase-Schema, Authentifizierung (Owner + Freelancer), rollenbasiertem Routing und geschützten Route-Stubs.

**Architecture:** Next.js 14 App Router mit zwei Route-Gruppen `(owner)` und `(freelancer)`. Supabase übernimmt Auth und Postgres. Middleware schützt Routen basierend auf der Rolle aus der `persons`-Tabelle. Kein Business-Logik-Code in diesem Plan – nur das Fundament.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Auth + Postgres + Realtime), Vitest, Playwright

---

## Dateistruktur

```
eventflow/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx          # Login-Formular (Email + Magic Link)
│   │   └── layout.tsx            # Auth-Layout (zentriert, kein Nav)
│   ├── (owner)/
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Owner-Dashboard Stub
│   │   └── layout.tsx            # Owner-Layout (mit Nav)
│   ├── (freelancer)/
│   │   ├── home/
│   │   │   └── page.tsx          # Freelancer-Home Stub
│   │   └── layout.tsx            # Freelancer-Layout (mobile-first)
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts          # Supabase Auth Callback Handler
│   ├── layout.tsx                # Root Layout
│   └── page.tsx                  # Root: Redirect basierend auf Rolle
├── components/
│   └── ui/                       # shadcn/ui Komponenten (auto-generiert)
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser-seitiger Supabase Client
│   │   ├── server.ts             # Server-seitiger Supabase Client (cookies)
│   │   └── types.ts              # Auto-generierte DB-Typen (supabase gen)
│   └── types.ts                  # Domain-Typen aus Spec
├── middleware.ts                  # Route-Schutz + Rollen-Redirect
├── supabase/
│   └── migrations/
│       ├── 20260405000001_initial_schema.sql   # Alle Tabellen
│       └── 20260405000002_rls_policies.sql     # Row Level Security
├── tests/
│   ├── unit/
│   │   └── types.test.ts         # Typ-Smoke-Tests
│   └── e2e/
│       └── auth.spec.ts          # Login-Flow E2E
├── .env.local                    # Supabase Keys (nicht committen)
├── next.config.ts
├── tailwind.config.ts
└── vitest.config.ts
```

---

## Task 1: Next.js-Projekt initialisieren

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts` (via CLI)

- [ ] **Schritt 1: Projekt erstellen**

```bash
cd c:/Users/teech/Antigravity/EventFlow
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```

Bei Nachfragen: alle Defaults bestätigen.

Erwartete Ausgabe: `✓ Ready in ...ms` und Verzeichnisinhalt mit `app/`, `package.json`, etc.

- [ ] **Schritt 2: Abhängigkeiten installieren**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitejs/plugin-react @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npx playwright install chromium
```

Erwartete Ausgabe: `added X packages` ohne Fehler.

- [ ] **Schritt 3: shadcn/ui initialisieren**

```bash
npx shadcn@latest init
```

Bei Nachfragen:
- Style: Default
- Base color: Slate
- CSS variables: Yes

- [ ] **Schritt 4: shadcn-Komponenten hinzufügen die wir brauchen**

```bash
npx shadcn@latest add button input label card badge separator
```

- [ ] **Schritt 5: Vitest konfigurieren**

Erstelle `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
```

Erstelle `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Schritt 6: Playwright konfigurieren**

Erstelle `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

- [ ] **Schritt 7: Scripts in package.json ergänzen**

Öffne `package.json` und ergänze im `scripts`-Block:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Schritt 8: Git initialisieren und ersten Commit machen**

```bash
git init
echo ".env.local" >> .gitignore
echo ".env" >> .gitignore
git add -A
git commit -m "chore: initialize Next.js project with TypeScript, Tailwind, shadcn/ui, Vitest, Playwright"
```

---

## Task 2: Domain-Typen definieren

**Files:**
- Create: `lib/types.ts`
- Create: `tests/unit/types.test.ts`

- [ ] **Schritt 1: Failing test schreiben**

Erstelle `tests/unit/types.test.ts`:

```typescript
import { describe, it, expectTypeOf } from 'vitest'
import type {
  Person,
  ProductionTemplate,
  Event,
  Role,
  Booking,
  EventStatus,
  BookingStatus,
  Skill,
} from '@/lib/types'

describe('Domain Types', () => {
  it('Person hat die erwarteten Felder', () => {
    expectTypeOf<Person>().toHaveProperty('id')
    expectTypeOf<Person>().toHaveProperty('name')
    expectTypeOf<Person>().toHaveProperty('skills')
    expectTypeOf<Person>().toHaveProperty('role')
  })

  it('Event hat status als EventStatus', () => {
    expectTypeOf<Event['status']>().toEqualTypeOf<EventStatus>()
  })

  it('Booking hat status als BookingStatus', () => {
    expectTypeOf<Booking['status']>().toEqualTypeOf<BookingStatus>()
  })

  it('EventStatus enthält cancelled', () => {
    const s: EventStatus = 'cancelled'
    expectTypeOf(s).toEqualTypeOf<EventStatus>()
  })
})
```

- [ ] **Schritt 2: Test ausführen – muss fehlschlagen**

```bash
npm test
```

Erwartete Ausgabe: `FAIL tests/unit/types.test.ts` mit "Cannot find module '@/lib/types'"

- [ ] **Schritt 3: Typen implementieren**

Erstelle `lib/types.ts`:

```typescript
export type Skill =
  | 'camera'
  | 'evs'
  | 'audio'
  | 'vision_mixing'
  | 'rf_tech'
  | 'replay'
  | 'graphics'

export type PersonRole = 'owner' | 'freelancer'

export type EventStatus =
  | 'draft'
  | 'booking'
  | 'confirmed'
  | 'live'
  | 'completed'
  | 'cancelled'

export type BookingStatus = 'sent' | 'confirmed' | 'declined'

export interface Person {
  id: string
  userId: string | null
  name: string
  phone: string
  email: string
  photoUrl: string | null
  skills: Skill[]
  notes: string
  role: PersonRole
  createdAt: string
}

export interface TemplatePhase {
  name: string
  defaultDurationHours: number
}

export interface RoleTemplate {
  title: string
  count: number
  preferredPersonIds: string[]
}

export interface ProductionTemplate {
  id: string
  name: string
  phases: TemplatePhase[]
  roleTemplates: RoleTemplate[]
  defaultVenueInfo: string
  createdAt: string
}

export interface ConcretePhase {
  name: string
  startTime: string // ISO datetime
  endTime: string   // ISO datetime
}

export interface Venue {
  name: string
  address: string
  gpsLat: number
  gpsLng: number
  parkingInfo: string
  accessInfo: string
}

export interface EventDocument {
  name: string
  url: string
}

export interface Event {
  id: string
  templateId: string | null
  title: string
  phases: ConcretePhase[]
  venue: Venue
  status: EventStatus
  documents: EventDocument[]
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Role {
  id: string
  eventId: string
  title: string
  assignedPersonId: string | null
  createdAt: string
}

export interface Booking {
  id: string
  roleId: string
  personId: string
  status: BookingStatus
  requestedAt: string
  respondedAt: string | null
  declineReason: string | null
  createdAt: string
}
```

- [ ] **Schritt 4: Tests ausführen – müssen bestehen**

```bash
npm test
```

Erwartete Ausgabe: `PASS tests/unit/types.test.ts` — 4 tests passed

- [ ] **Schritt 5: Commit**

```bash
git add lib/types.ts tests/unit/types.test.ts tests/setup.ts vitest.config.ts playwright.config.ts
git commit -m "feat: add domain types from spec"
```

---

## Task 3: Supabase-Projekt verbinden

**Files:**
- Create: `.env.local`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

**Voraussetzung:** Supabase-Projekt auf [supabase.com](https://supabase.com) erstellen (oder via Supabase MCP-Tool), Project URL und Anon Key kopieren.

- [ ] **Schritt 1: Umgebungsvariablen setzen**

Erstelle `.env.local` im Projektroot:

```
NEXT_PUBLIC_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key
```

Werte aus Supabase Dashboard → Settings → API.

- [ ] **Schritt 2: Browser-Client erstellen**

Erstelle `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Schritt 3: Server-Client erstellen**

Erstelle `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Component – cookies können nicht gesetzt werden, ignorieren
          }
        },
      },
    }
  )
}
```

- [ ] **Schritt 4: Build prüfen**

```bash
npm run build
```

Erwartete Ausgabe: `✓ Compiled successfully` — keine TypeScript-Fehler.

- [ ] **Schritt 5: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/server.ts
git commit -m "feat: add Supabase browser and server clients"
```

---

## Task 4: Datenbank-Schema migrieren

**Files:**
- Create: `supabase/migrations/20260405000001_initial_schema.sql`

- [ ] **Schritt 1: Supabase CLI installieren (falls nicht vorhanden)**

```bash
npm install -g supabase
supabase --version
```

Erwartete Ausgabe: `1.x.x` oder höher.

- [ ] **Schritt 2: Migration schreiben**

Erstelle `supabase/migrations/20260405000001_initial_schema.sql`:

```sql
-- Persons (Owner + Freelancer)
CREATE TABLE persons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL UNIQUE,
  photo_url   TEXT,
  skills      TEXT[] NOT NULL DEFAULT '{}',
  notes       TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL CHECK (role IN ('owner', 'freelancer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Production Templates
CREATE TABLE production_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  phases              JSONB NOT NULL DEFAULT '[]',
  role_templates      JSONB NOT NULL DEFAULT '[]',
  default_venue_info  TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID REFERENCES production_templates(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  phases       JSONB NOT NULL DEFAULT '[]',
  venue        JSONB NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','booking','confirmed','live','completed','cancelled')),
  documents    JSONB NOT NULL DEFAULT '[]',
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: updated_at automatisch aktualisieren
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Roles (innerhalb eines Events)
CREATE TABLE roles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  assigned_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id        UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  person_id      UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'sent'
                 CHECK (status IN ('sent','confirmed','declined')),
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at   TIMESTAMPTZ,
  decline_reason TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für häufige Queries
CREATE INDEX idx_roles_event_id ON roles(event_id);
CREATE INDEX idx_bookings_role_id ON bookings(role_id);
CREATE INDEX idx_bookings_person_id ON bookings(person_id);
CREATE INDEX idx_persons_user_id ON persons(user_id);
CREATE INDEX idx_events_status ON events(status);
```

- [ ] **Schritt 3: Migration auf Supabase anwenden**

Option A – via Supabase Dashboard (SQL Editor):
Den Inhalt der Migration-Datei ins SQL Editor-Fenster kopieren und ausführen.

Option B – via Supabase MCP Tool (falls verfügbar):
```
mcp__plugin_supabase_supabase__apply_migration mit dem SQL-Inhalt
```

Erwartete Ausgabe: Alle 5 Tabellen erscheinen im Table Editor.

- [ ] **Schritt 4: Commit**

```bash
git add supabase/
git commit -m "feat: add initial database schema (persons, templates, events, roles, bookings)"
```

---

## Task 5: Row Level Security (RLS) konfigurieren

**Files:**
- Create: `supabase/migrations/20260405000002_rls_policies.sql`

- [ ] **Schritt 1: RLS-Migration schreiben**

Erstelle `supabase/migrations/20260405000002_rls_policies.sql`:

```sql
-- RLS aktivieren
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Helper-Funktion: prüft ob der aktuelle User Owner ist
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM persons
    WHERE user_id = auth.uid()
    AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper-Funktion: gibt die person_id des aktuellen Users zurück
CREATE OR REPLACE FUNCTION my_person_id()
RETURNS UUID AS $$
  SELECT id FROM persons WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PERSONS: Owner sieht alle, Freelancer nur sich selbst
CREATE POLICY "owner_all_persons" ON persons
  FOR ALL TO authenticated
  USING (is_owner());

CREATE POLICY "freelancer_own_person" ON persons
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- PRODUCTION_TEMPLATES: nur Owner
CREATE POLICY "owner_all_templates" ON production_templates
  FOR ALL TO authenticated
  USING (is_owner());

-- EVENTS: Owner sieht alle; Freelancer sieht Events wo sie eine Buchung haben
CREATE POLICY "owner_all_events" ON events
  FOR ALL TO authenticated
  USING (is_owner());

CREATE POLICY "freelancer_booked_events" ON events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      JOIN bookings b ON b.role_id = r.id
      WHERE r.event_id = events.id
      AND b.person_id = my_person_id()
      AND b.status = 'confirmed'
    )
  );

-- ROLES: Owner sieht alle; Freelancer sieht Roles in ihren Events
CREATE POLICY "owner_all_roles" ON roles
  FOR ALL TO authenticated
  USING (is_owner());

CREATE POLICY "freelancer_event_roles" ON roles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN roles r2 ON r2.event_id = e.id
      JOIN bookings b ON b.role_id = r2.id
      WHERE e.id = roles.event_id
      AND b.person_id = my_person_id()
      AND b.status = 'confirmed'
    )
  );

-- BOOKINGS: Owner sieht alle; Freelancer sieht + updated eigene Bookings
CREATE POLICY "owner_all_bookings" ON bookings
  FOR ALL TO authenticated
  USING (is_owner());

CREATE POLICY "freelancer_own_bookings_read" ON bookings
  FOR SELECT TO authenticated
  USING (person_id = my_person_id());

CREATE POLICY "freelancer_own_bookings_update" ON bookings
  FOR UPDATE TO authenticated
  USING (person_id = my_person_id())
  WITH CHECK (person_id = my_person_id());
```

- [ ] **Schritt 2: Migration anwenden** (wie in Task 4 Schritt 3)

Erwartete Ausgabe: RLS-Policies erscheinen in Supabase Dashboard → Authentication → Policies.

- [ ] **Schritt 3: Commit**

```bash
git add supabase/migrations/20260405000002_rls_policies.sql
git commit -m "feat: add RLS policies for owner and freelancer roles"
```

---

## Task 6: Auth Callback Route + Middleware

**Files:**
- Create: `app/auth/callback/route.ts`
- Create: `middleware.ts`

- [ ] **Schritt 1: Auth Callback Route erstellen**

Erstelle `app/auth/callback/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

- [ ] **Schritt 2: Middleware für Routing-Schutz erstellen**

Erstelle `middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Unauthentifiziert → Login
  if (!user && pathname !== '/login' && !pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Bereits eingeloggt → nicht zur Login-Seite
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Rollenbasiertes Routing für geschützte Bereiche
  if (user && (pathname.startsWith('/dashboard') || pathname.startsWith('/home'))) {
    const { data: person } = await supabase
      .from('persons')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!person) {
      // Kein Person-Eintrag → Logout und Login
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login?error=no_profile', request.url))
    }

    if (pathname.startsWith('/dashboard') && person.role !== 'owner') {
      return NextResponse.redirect(new URL('/home', request.url))
    }

    if (pathname.startsWith('/home') && person.role !== 'freelancer') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Schritt 3: Root-Seite als Redirect erstellen**

Ersetze `app/page.tsx` vollständig:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: person } = await supabase
    .from('persons')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (person?.role === 'owner') {
    redirect('/dashboard')
  }

  redirect('/home')
}
```

- [ ] **Schritt 4: Commit**

```bash
git add app/auth/callback/route.ts middleware.ts app/page.tsx
git commit -m "feat: add auth callback route and role-based middleware"
```

---

## Task 7: Login-Seite

**Files:**
- Create: `app/(auth)/layout.tsx`
- Create: `app/(auth)/login/page.tsx`

- [ ] **Schritt 1: Auth-Layout erstellen**

Erstelle `app/(auth)/layout.tsx`:

```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      {children}
    </div>
  )
}
```

- [ ] **Schritt 2: Login-Seite erstellen**

Erstelle `app/(auth)/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)
    if (!error) {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Link verschickt</CardTitle>
          <CardDescription>
            Prüfe deine E-Mails und klicke auf den Link um dich anzumelden.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>EventFlow</CardTitle>
        <CardDescription>Melde dich mit deiner E-Mail-Adresse an.</CardDescription>
      </CardHeader>
      <CardContent>
        {searchParams.error === 'no_profile' && (
          <p className="text-sm text-red-600 mb-4">
            Kein Profil gefunden. Bitte wende dich an den Inhaber.
          </p>
        )}
        {searchParams.error === 'auth_callback_failed' && (
          <p className="text-sm text-red-600 mb-4">
            Anmeldung fehlgeschlagen. Bitte versuche es erneut.
          </p>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sende Link...' : 'Magic Link senden'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Schritt 3: Dev-Server starten und manuell prüfen**

```bash
npm run dev
```

Browser öffnen: `http://localhost:3000` → muss zu `/login` redirecten.
Login-Formular muss sichtbar sein.

- [ ] **Schritt 4: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: add magic link login page"
```

---

## Task 8: Owner-Dashboard Stub

**Files:**
- Create: `app/(owner)/layout.tsx`
- Create: `app/(owner)/dashboard/page.tsx`

- [ ] **Schritt 1: Owner-Layout erstellen**

Erstelle `app/(owner)/layout.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: person } = await supabase
    .from('persons')
    .select('name, role')
    .eq('user_id', user.id)
    .single()

  if (person?.role !== 'owner') redirect('/home')

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="font-semibold text-slate-900">EventFlow</span>
          <span className="text-sm text-slate-500">{person?.name}</span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Schritt 2: Dashboard-Stub erstellen**

Erstelle `app/(owner)/dashboard/page.tsx`:

```typescript
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h1>
      <p className="text-slate-500">Events und Buchungen — folgt in Plan 2 & 3.</p>
    </div>
  )
}
```

- [ ] **Schritt 3: Commit**

```bash
git add app/\(owner\)/
git commit -m "feat: add owner layout and dashboard stub"
```

---

## Task 9: Freelancer-Home Stub

**Files:**
- Create: `app/(freelancer)/layout.tsx`
- Create: `app/(freelancer)/home/page.tsx`

- [ ] **Schritt 1: Freelancer-Layout erstellen**

Erstelle `app/(freelancer)/layout.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function FreelancerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: person } = await supabase
    .from('persons')
    .select('name, role')
    .eq('user_id', user.id)
    .single()

  if (person?.role !== 'freelancer') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto">
      <main className="px-4 py-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Schritt 2: Home-Stub erstellen**

Erstelle `app/(freelancer)/home/page.tsx`:

```typescript
export default function FreelancerHomePage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-2">Meine Events</h1>
      <p className="text-slate-500">Call Sheets und Anfragen — folgt in Plan 3 & 4.</p>
    </div>
  )
}
```

- [ ] **Schritt 3: Commit**

```bash
git add app/\(freelancer\)/
git commit -m "feat: add freelancer layout and home stub"
```

---

## Task 10: Seed-Daten für Entwicklung

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Schritt 1: Seed-SQL schreiben**

Erstelle `supabase/seed.sql`:

```sql
-- Hinweis: user_id bleibt NULL – wird beim ersten Login verknüpft.
-- Erst via Supabase Dashboard die User erstellen, dann IDs hier eintragen.

-- Owner
INSERT INTO persons (name, email, phone, role, skills, notes)
VALUES (
  'Marco Berther',
  'marco@ehc-production.ch',
  '+41 79 000 00 01',
  'owner',
  '{}',
  'Inhaber'
);

-- Freelancer-Pool (EHC Chur Produktionsteam)
INSERT INTO persons (name, email, phone, role, skills, notes) VALUES
  ('Max Müller',    'max@crew.ch',    '+41 79 000 00 02', 'freelancer', ARRAY['camera'],        'Sony FX9 zertifiziert'),
  ('Lena Graf',     'lena@crew.ch',   '+41 79 000 00 03', 'freelancer', ARRAY['camera'],        ''),
  ('Sara Bauer',    'sara@crew.ch',   '+41 79 000 00 04', 'freelancer', ARRAY['audio'],         'DPA-Mikrofone'),
  ('Tom Keller',    'tom@crew.ch',    '+41 79 000 00 05', 'freelancer', ARRAY['vision_mixing'], ''),
  ('Urs Caflisch',  'urs@crew.ch',    '+41 79 000 00 06', 'freelancer', ARRAY['evs'],           'EVS LSM-VIA'),
  ('Anna Schmidt',  'anna@crew.ch',   '+41 79 000 00 07', 'freelancer', ARRAY['graphics'],      ''),
  ('Peter Huber',   'peter@crew.ch',  '+41 79 000 00 08', 'freelancer', ARRAY['rf_tech'],       '');

-- Beispiel-Template: NL2 Heimspiel EHC Chur
INSERT INTO production_templates (name, phases, role_templates, default_venue_info)
VALUES (
  'NL2 Heimspiel EHC Chur',
  '[
    {"name": "Rigging",   "defaultDurationHours": 4},
    {"name": "Rehearsal", "defaultDurationHours": 2},
    {"name": "Live",      "defaultDurationHours": 3}
  ]',
  '[
    {"title": "Kameramann 1",  "count": 1, "preferredPersonIds": []},
    {"title": "Kameramann 2",  "count": 1, "preferredPersonIds": []},
    {"title": "EVS-Operator",  "count": 1, "preferredPersonIds": []},
    {"title": "Toningenieur",  "count": 1, "preferredPersonIds": []},
    {"title": "Bildmischer",   "count": 1, "preferredPersonIds": []}
  ]',
  'Eissportzentrum Chur, Güterstrasse 5, 7000 Chur. Ü-Wagen: Eingang Nord, Tor B.'
);
```

- [ ] **Schritt 2: Seed anwenden** (via Supabase Dashboard → SQL Editor)

Den Inhalt von `supabase/seed.sql` ausführen.

Erwartete Ausgabe: 8 Zeilen in `persons`, 1 Zeile in `production_templates`.

- [ ] **Schritt 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "chore: add development seed data (crew pool + NL2 template)"
```

---

## Task 11: E2E Smoke-Test für Auth-Flow

**Files:**
- Create: `tests/e2e/auth.spec.ts`

- [ ] **Schritt 1: E2E-Test schreiben**

Erstelle `tests/e2e/auth.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Auth Flow', () => {
  test('unauthentifizierter User wird zu /login redirectet', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText('EventFlow')).toBeVisible()
  })

  test('Login-Formular ist sichtbar und hat Email-Feld', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('E-Mail')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Magic Link senden' })).toBeVisible()
  })

  test('/dashboard ohne Auth redirectet zu /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/home ohne Auth redirectet zu /login', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/\/login/)
  })
})
```

- [ ] **Schritt 2: Dev-Server starten und E2E-Tests ausführen**

```bash
npm run dev &
npm run test:e2e
```

Erwartete Ausgabe: `4 passed` — alle Redirects funktionieren.

- [ ] **Schritt 3: Commit**

```bash
git add tests/e2e/auth.spec.ts
git commit -m "test: add E2E smoke tests for auth redirects"
```

---

## Self-Review Checkliste

- [x] **Spec-Abdeckung:** Alle 5 Datenobjekte aus Spec § 2 sind im Schema (Task 4). Auth (Task 3/6). Zwei Nutzerrollen (Task 6/7/8/9). RLS (Task 5). ✓
- [x] **Placeholder-Scan:** Keine TBDs oder TODOs im Plan. ✓
- [x] **Typ-Konsistenz:** `lib/types.ts` Felder (camelCase) vs. DB (snake_case) – bewusster Unterschied, wird in Plan 2 mit einem Mapper aufgelöst. Notiert in Offene Fragen.
- [x] **EventStatus `cancelled`:** Im SQL-Check-Constraint enthalten. ✓

### Offene Punkte für Plan 2

1. **DB ↔ TypeScript Mapper:** `snake_case` DB-Felder → `camelCase` TypeScript-Typen. Muss in Plan 2 als Hilfsfunktion eingeführt werden.
2. **Supabase Generated Types:** `npx supabase gen types typescript` nach Schema-Setup ausführen → `lib/supabase/types.ts` generieren. Kann nach Task 4 gemacht werden.
3. **Person–User Verknüpfung:** Beim ersten Login eines Freelancers muss `persons.user_id` gesetzt werden. Flow: Freelancer erhält Einladungs-Mail, klickt Magic Link, Callback prüft ob `persons` mit dieser E-Mail existiert und setzt `user_id`. → Implementierung in Plan 2.
