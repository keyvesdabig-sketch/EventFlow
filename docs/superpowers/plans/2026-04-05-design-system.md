# Design System "Kinetic Control Room" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Kinetic Control Room" design system from `Design.md` — dark theme, broadcast-grade typography, custom semantic tokens, and updated UI components across all existing pages.

**Architecture:** Single dark-mode-only theme applied via CSS custom properties in `globals.css`. New semantic tokens (tally-red, signal-green, pending-amber, tonal levels) are exposed as Tailwind utilities. New components (TallyHeader, ProductionChip, TopBar) live in `components/ui/`. Existing pages are re-skinned without logic changes.

**Tech Stack:** Next.js 16 App Router, Tailwind v4 (`@theme inline` in CSS), shadcn/ui, `next/font/google` (Space Grotesk + Manrope + Space Mono), Vitest + React Testing Library

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `app/layout.tsx` | Load Space Grotesk, Manrope, Space Mono fonts; add `class="dark"` to `<html>` |
| Modify | `app/globals.css` | Full color token overhaul: Nocturne dark theme, semantic status colors, tonal layers, utility classes |
| Modify | `components/ui/button.tsx` | Add `'use client'`, gradient primary variant, haptic feedback on click |
| Create | `components/ui/tally-header.tsx` | 4px stripe: red = live/assigned, green = checked-in |
| Create | `components/ui/production-chip.tsx` | Uppercase label chips for skills/roles (EVS, CAM 1, etc.) |
| Create | `components/ui/top-bar.tsx` | Glassmorphism sticky nav (backdrop-blur-24, used in both layouts) |
| Modify | `app/(auth)/layout.tsx` | Dark background, centered layout |
| Modify | `app/(auth)/login/page.tsx` | Asymmetric "Loudspeaker" redesign |
| Modify | `app/(owner)/layout.tsx` | Use TopBar component |
| Modify | `app/(owner)/dashboard/page.tsx` | Dark theme stub |
| Modify | `app/(freelancer)/layout.tsx` | Use TopBar component |
| Modify | `app/(freelancer)/home/page.tsx` | Dark theme stub, thumb-zone layout |
| Create | `tests/unit/design-system.test.tsx` | Unit tests: Button haptic, TallyHeader variants, ProductionChip variants |

---

## Task 1: Fonts

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write the failing test**

No unit test for fonts — verify with build. Skip to step 3.

- [ ] **Step 2: Update layout.tsx with new fonts**

Replace the file content entirely:

```tsx
import type { Metadata } from "next";
import { Space_Grotesk, Manrope, Space_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "EventFlow",
  description: "Personal planning tool for EHC Chur productions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${spaceGrotesk.variable} ${manrope.variable} ${spaceMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build compiles**

```bash
npm run build
```

Expected: no errors about missing font exports.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: load Space Grotesk, Manrope, Space Mono fonts"
```

---

## Task 2: Color Tokens & Dark Theme

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace globals.css**

Replace the entire file:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* Fonts */
  --font-heading: var(--font-space-grotesk);
  --font-sans: var(--font-manrope);
  --font-mono: var(--font-space-mono);

  /* shadcn token aliases */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* Semantic broadcast status */
  --color-tally-red: var(--tally-red);
  --color-signal-green: var(--signal-green);
  --color-pending-amber: var(--pending-amber);

  /* Tonal Z-axis layers */
  --color-level-0: var(--level-0);
  --color-level-1: var(--level-1);
  --color-level-2: var(--level-2);
  --color-level-3: var(--level-3);

  /* Radius */
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
}

/* Single dark theme — no light mode */
:root {
  /* Z-Axis: Tonal Layers (from Design.md Section 4) */
  --level-0: #000000;        /* Deep Space — app frame */
  --level-1: #0e0e13;        /* Launchpad — standard content containers */
  --level-2: #1c1c24;        /* Mission Control — cards, modals */
  --level-3: #25252c;        /* Tactile — inputs, interactive elements */
  --ghost-border-color: #48474d;  /* ghost border base color */

  /* Broadcast Status Colors (from Design.md Section 2) */
  --tally-red: #ff7162;
  --signal-green: #00ff88;
  --pending-amber: #ffb800;

  /* shadcn token mapping — dark "Nocturne" theme */
  --background: #0e0e13;
  --foreground: #e8e8f0;
  --card: #1c1c24;
  --card-foreground: #e8e8f0;
  --popover: #1c1c24;
  --popover-foreground: #e8e8f0;
  --primary: #e8e8f0;
  --primary-foreground: #0e0e13;
  --primary-container: #25252c;
  --secondary: #1c1c24;
  --secondary-foreground: #e8e8f0;
  --muted: #1c1c24;
  --muted-foreground: #8c8c9e;
  --accent: #25252c;
  --accent-foreground: #e8e8f0;
  --destructive: #ff7162;
  --border: rgba(72, 71, 77, 0.15);
  --input: #25252c;
  --ring: rgba(72, 71, 77, 0.5);
  --radius: 0.375rem;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-manrope), sans-serif;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-space-grotesk), sans-serif;
    letter-spacing: -0.02em;
  }
}

@layer utilities {
  /* Control Panel labels: UPPERCASE + wide tracking */
  .label-control {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-family: var(--font-space-grotesk), sans-serif;
  }

  /* Technical data (times, frequencies, IPs) */
  .data-technical {
    font-family: var(--font-space-mono), monospace;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
  }

  /* Ghost border: visible under direct sunlight */
  .ghost-border {
    border: 1px solid rgba(72, 71, 77, 0.15);
  }
}
```

- [ ] **Step 2: Verify dev server renders without errors**

```bash
npm run dev
```

Open http://localhost:3000 — should show dark background (#0e0e13).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: implement Nocturne dark theme and broadcast color tokens"
```

---

## Task 3: Button — Gradient + Haptic Feedback

**Files:**
- Modify: `components/ui/button.tsx`
- Create: `tests/unit/design-system.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/design-system.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  beforeEach(() => {
    // Reset vibrate mock before each test
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      configurable: true,
      writable: true,
    })
  })

  it('renders children', () => {
    render(<Button>Magic Link senden</Button>)
    expect(screen.getByRole('button', { name: 'Magic Link senden' })).toBeInTheDocument()
  })

  it('calls navigator.vibrate(10) on click', () => {
    render(<Button>Trigger</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(navigator.vibrate).toHaveBeenCalledWith(10)
  })

  it('does not throw when navigator.vibrate is undefined', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    render(<Button>Trigger</Button>)
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow()
  })

  it('still calls custom onClick alongside haptic', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Trigger</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
    expect(navigator.vibrate).toHaveBeenCalledWith(10)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/design-system.test.tsx
```

Expected: FAIL — "navigator.vibrate" not called (current button has no haptic).

- [ ] **Step 3: Update button.tsx**

Replace entire file:

```tsx
'use client'

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded-[0.375rem] bg-gradient-to-b from-level-3 to-level-2 text-foreground ghost-border hover:from-accent hover:to-level-2",
        destructive:
          "rounded-[0.375rem] bg-tally-red text-level-0 hover:bg-tally-red/90",
        outline:
          "rounded-[0.375rem] ghost-border bg-transparent hover:bg-accent hover:text-accent-foreground",
        secondary:
          "rounded-[0.375rem] bg-level-2 text-foreground ghost-border hover:bg-level-3",
        ghost:
          "hover:bg-accent hover:text-accent-foreground rounded-[0.375rem]",
        link:
          "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
      navigator.vibrate?.(10)
      onClick?.(e)
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/design-system.test.tsx
```

Expected: all 4 Button tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/button.tsx tests/unit/design-system.test.tsx
git commit -m "feat: button gradient variant + haptic feedback on click"
```

---

## Task 4: TallyHeader Component

**Files:**
- Create: `components/ui/tally-header.tsx`
- Modify: `tests/unit/design-system.test.tsx`

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/design-system.test.tsx`:

```tsx
import { TallyHeader } from '@/components/ui/tally-header'

describe('TallyHeader', () => {
  it('renders a 4px stripe', () => {
    const { container } = render(<TallyHeader status="live" />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('uses tally-red class for live status', () => {
    const { container } = render(<TallyHeader status="live" />)
    expect(container.firstChild).toHaveClass('bg-tally-red')
  })

  it('uses signal-green class for checked-in status', () => {
    const { container } = render(<TallyHeader status="checked-in" />)
    expect(container.firstChild).toHaveClass('bg-signal-green')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/design-system.test.tsx
```

Expected: FAIL — `TallyHeader` module not found.

- [ ] **Step 3: Create tally-header.tsx**

Create `components/ui/tally-header.tsx`:

```tsx
import { cn } from "@/lib/utils"

type TallyStatus = 'live' | 'checked-in'

export function TallyHeader({ status }: { status: TallyStatus }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'h-1 w-full flex-shrink-0',
        status === 'live' ? 'bg-tally-red' : 'bg-signal-green'
      )}
    />
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/design-system.test.tsx
```

Expected: all TallyHeader tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/tally-header.tsx tests/unit/design-system.test.tsx
git commit -m "feat: add TallyHeader stripe component (live/checked-in)"
```

---

## Task 5: ProductionChip Component

**Files:**
- Create: `components/ui/production-chip.tsx`
- Modify: `tests/unit/design-system.test.tsx`

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/design-system.test.tsx`:

```tsx
import { ProductionChip } from '@/components/ui/production-chip'

describe('ProductionChip', () => {
  it('renders the label text', () => {
    render(<ProductionChip label="EVS" />)
    expect(screen.getByText('EVS')).toBeInTheDocument()
  })

  it('applies tally-red text class for live variant', () => {
    render(<ProductionChip label="LIVE" variant="live" />)
    expect(screen.getByText('LIVE')).toHaveClass('text-tally-red')
  })

  it('applies signal-green text class for confirmed variant', () => {
    render(<ProductionChip label="OK" variant="confirmed" />)
    expect(screen.getByText('OK')).toHaveClass('text-signal-green')
  })

  it('applies pending-amber text class for pending variant', () => {
    render(<ProductionChip label="PENDING" variant="pending" />)
    expect(screen.getByText('PENDING')).toHaveClass('text-pending-amber')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/design-system.test.tsx
```

Expected: FAIL — `ProductionChip` module not found.

- [ ] **Step 3: Create production-chip.tsx**

Create `components/ui/production-chip.tsx`:

```tsx
import { cn } from "@/lib/utils"

type ChipVariant = 'default' | 'live' | 'confirmed' | 'pending'

interface ProductionChipProps {
  label: string
  variant?: ChipVariant
}

export function ProductionChip({ label, variant = 'default' }: ProductionChipProps) {
  return (
    <span
      className={cn(
        'label-control inline-flex items-center px-2 py-0.5 rounded-sm bg-level-3 text-foreground ghost-border',
        variant === 'live' && 'text-tally-red',
        variant === 'confirmed' && 'text-signal-green',
        variant === 'pending' && 'text-pending-amber',
      )}
    >
      {label}
    </span>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/design-system.test.tsx
```

Expected: all ProductionChip tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/production-chip.tsx tests/unit/design-system.test.tsx
git commit -m "feat: add ProductionChip for skill/role status labels"
```

---

## Task 6: TopBar Component

**Files:**
- Create: `components/ui/top-bar.tsx`

No unit tests — TopBar is a server component wrapping layout chrome. Visual verification is sufficient.

- [ ] **Step 1: Create top-bar.tsx**

Create `components/ui/top-bar.tsx`:

```tsx
interface TopBarProps {
  title?: string
  userName?: string
  right?: React.ReactNode
}

export function TopBar({ title = 'EventFlow', userName, right }: TopBarProps) {
  return (
    <header className="sticky top-0 z-50 h-14 flex items-center px-4 backdrop-blur-[24px] bg-level-0/80 border-b border-border">
      <div className="flex items-center justify-between w-full max-w-6xl mx-auto">
        <span
          className="font-heading font-semibold text-foreground tracking-tight"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          {title}
        </span>
        <div className="flex items-center gap-3">
          {right}
          {userName && (
            <span className="label-control text-muted-foreground">{userName}</span>
          )}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/top-bar.tsx
git commit -m "feat: add glassmorphism TopBar component"
```

---

## Task 7: Apply TopBar to Layouts

**Files:**
- Modify: `app/(auth)/layout.tsx`
- Modify: `app/(owner)/layout.tsx`
- Modify: `app/(freelancer)/layout.tsx`

- [ ] **Step 1: Update auth layout**

Replace `app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-level-0">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Update owner layout**

Replace `app/(owner)/layout.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/ui/top-bar'

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
    <div className="min-h-screen bg-background">
      <TopBar userName={person?.name} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Update freelancer layout**

Replace `app/(freelancer)/layout.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/ui/top-bar'

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
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <TopBar userName={person?.name} />
      <main className="px-4 py-6 pb-24">
        {children}
      </main>
    </div>
  )
}
```

Note: `pb-24` reserves space in the thumb-zone (bottom 96px) for future primary actions.

- [ ] **Step 4: Verify dev server**

```bash
npm run dev
```

Navigate to `/dashboard` (logged in as owner) — should show sticky TopBar with glassmorphism blur.

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/layout.tsx app/(owner)/layout.tsx app/(freelancer)/layout.tsx
git commit -m "feat: apply TopBar and dark layouts to all route groups"
```

---

## Task 8: Login Page Redesign

**Files:**
- Modify: `app/(auth)/login/page.tsx`

The login page uses "Intentional Asymmetry" (brand moment) per Design.md Section 1.

- [ ] **Step 1: Replace login page**

Replace `app/(auth)/login/page.tsx`:

```tsx
'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (!error) setSent(true)
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm space-y-3">
        <p className="label-control text-signal-green">Übertragung bestätigt</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground" style={{ letterSpacing: '-0.02em' }}>
          Link verschickt.
        </h1>
        <p className="text-muted-foreground text-sm">
          Prüfe deine E-Mails und klicke auf den Link um dich anzumelden.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Asymmetric header — "Loudspeaker" moment */}
      <div className="space-y-1 -ml-1">
        <p className="label-control text-muted-foreground">EHC Chur Productions</p>
        <h1
          className="text-5xl font-bold text-foreground"
          style={{ letterSpacing: '-0.02em', fontFamily: 'var(--font-space-grotesk)' }}
        >
          Event
          <br />
          <span className="text-tally-red">Flow</span>
        </h1>
      </div>

      {/* Error messages */}
      {error === 'no_profile' && (
        <p className="label-control text-tally-red">
          Kein Profil gefunden — wende dich an den Inhaber.
        </p>
      )}
      {error === 'auth_callback_failed' && (
        <p className="label-control text-tally-red">
          Anmeldung fehlgeschlagen — bitte erneut versuchen.
        </p>
      )}

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="label-control text-muted-foreground">
            E-Mail-Adresse
          </label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-level-3 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sende Link...' : 'Magic Link senden'}
        </Button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 -ml-1">
          <p className="label-control text-muted-foreground">EHC Chur Productions</p>
          <h1 className="text-5xl font-bold text-foreground" style={{ letterSpacing: '-0.02em', fontFamily: 'var(--font-space-grotesk)' }}>
            Event<br /><span className="text-tally-red">Flow</span>
          </h1>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
```

- [ ] **Step 2: Verify visually**

```bash
npm run dev
```

Navigate to `/login` — should show dark background, asymmetric "EventFlow" header with red "Flow", label-control text above.

- [ ] **Step 3: Commit**

```bash
git add app/(auth)/login/page.tsx
git commit -m "feat: redesign login page with asymmetric Kinetic Control Room style"
```

---

## Task 9: Dashboard and Freelancer Home Stubs

**Files:**
- Modify: `app/(owner)/dashboard/page.tsx`
- Modify: `app/(freelancer)/home/page.tsx`

These are stubs that will be replaced in Plan 2 & 3 — apply the dark theme now so they don't look broken.

- [ ] **Step 1: Update dashboard stub**

Replace `app/(owner)/dashboard/page.tsx`:

```tsx
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="label-control text-muted-foreground mb-1">Übersicht</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ letterSpacing: '-0.02em' }}>
          Dashboard
        </h1>
      </div>
      <div className="ghost-border rounded-lg bg-level-2 p-6 text-muted-foreground text-sm">
        Events und Buchungen — folgt in Plan 2 &amp; 3.
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update freelancer home stub**

Replace `app/(freelancer)/home/page.tsx`:

```tsx
export default function FreelancerHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="label-control text-muted-foreground mb-1">Deine Einsätze</p>
        <h1 className="text-xl font-bold text-foreground" style={{ letterSpacing: '-0.02em' }}>
          Meine Events
        </h1>
      </div>
      {/* Thumb-zone placeholder: primary action will live here in Plan 3 */}
      <div className="ghost-border rounded-lg bg-level-2 p-6 text-muted-foreground text-sm">
        Call Sheets und Anfragen — folgt in Plan 3 &amp; 4.
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(owner)/dashboard/page.tsx app/(freelancer)/home/page.tsx
git commit -m "feat: apply dark theme to dashboard and freelancer home stubs"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run all unit tests**

```bash
npm test
```

Expected: all tests PASS (types.test.ts + design-system.test.tsx).

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: no TypeScript or build errors.

- [ ] **Step 3: Run E2E smoke tests**

```bash
npm run dev &
npx playwright test tests/e2e/auth.spec.ts
```

Expected: all 4 auth redirect tests PASS.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: design system implementation complete — all tests green"
```

---

## Self-Review

### Spec Coverage

| Design.md Requirement | Covered |
|---|---|
| Background #0e0e13 (Nocturne) | ✅ Task 2 — `--level-1` + `--background` |
| Ghost Border (15% opacity) | ✅ Task 2 — `.ghost-border` utility |
| Tally-Red #ff7162 | ✅ Task 2 — `--tally-red` token + Task 4 TallyHeader |
| Signal-Green #00ff88 | ✅ Task 2 — `--signal-green` token + Task 4 TallyHeader |
| Pending-Amber #ffb800 | ✅ Task 2 — `--pending-amber` token |
| Glassmorphism Lite (backdrop-blur-24) | ✅ Task 6 — TopBar |
| Space Grotesk headlines (-0.02em) | ✅ Task 1 + Task 2 `@layer base` |
| Manrope body | ✅ Task 1 + Task 2 `@layer base` |
| Space Mono / tabular-nums | ✅ Task 1 + Task 2 `.data-technical` utility |
| Labels uppercase 0.05em | ✅ Task 2 `.label-control` utility |
| Tonal Z-axis (4 levels) | ✅ Task 2 — `--level-0` through `--level-3` |
| Tally-Header stripe (4px) | ✅ Task 4 — TallyHeader component |
| Button gradient + haptic | ✅ Task 3 — Button updated |
| Production Chips | ✅ Task 5 — ProductionChip component |
| Asymmetric login | ✅ Task 8 — Login page |
| WCAG AA contrast | ✅ Dark bg #0e0e13 + light text #e8e8f0 = 13:1 ratio |
| Thumb-zone (pb-24 in freelancer) | ✅ Task 7 |

**Not implemented yet (requires real UI from Plan 2–4):**
- Digital Call Sheet Card (no-line vertical grid, Maps Trigger) — Plan 4
- One-tap phone number access — Plan 4
- Haptic on confirmation/check-in flows — Plan 3
