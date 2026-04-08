# Template Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owner kann bestehende Production Templates inline bearbeiten sowie neue Templates erstellen (von Scratch oder als Duplikat).

**Architecture:** Die bestehende Server Component-Detailseite gibt Template-Daten an eine neue `TemplateInlineEditor` Client Component weiter, die lokal zwischen View- und Edit-Modus wechselt. Server Actions (`updateTemplateAction`, `createTemplateAction`) persistieren Änderungen via Supabase. Neue Templates entstehen über `/templates/new`, optional mit `?from=[id]` für Duplikate.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (Postgres), Server Actions, shadcn/ui Button, Tailwind CSS

---

## File Map

| Datei | Status | Verantwortung |
|---|---|---|
| `app/(owner)/templates/[id]/inline-editor.tsx` | NEU | Client Component — View/Edit-Toggle, Formular, Speichern |
| `app/(owner)/templates/[id]/actions.ts` | NEU | Server Action `updateTemplateAction` |
| `app/(owner)/templates/new/page.tsx` | NEU | Server Component — leeres oder geklontes Template laden |
| `app/(owner)/templates/new/actions.ts` | NEU | Server Action `createTemplateAction` |
| `app/(owner)/templates/[id]/page.tsx` | ÄNDERN | Rendert neu `<TemplateInlineEditor>` statt direkter Ausgabe |
| `app/(owner)/templates/page.tsx` | ÄNDERN | Neues-Template-Button + Duplizieren-Link pro Zeile |

---

## Task 1: Server Actions — Update und Create

**Files:**
- Create: `app/(owner)/templates/[id]/actions.ts`
- Create: `app/(owner)/templates/new/actions.ts`

- [ ] **Step 1: `updateTemplateAction` erstellen**

Datei anlegen `app/(owner)/templates/[id]/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TemplatePhase, RoleTemplate } from '@/lib/types'

export async function updateTemplateAction(
  id: string,
  data: {
    name: string
    phases: TemplatePhase[]
    roleTemplates: RoleTemplate[]
    defaultVenueInfo: string
  }
): Promise<{ error: string } | void> {
  if (!data.name.trim()) return { error: 'Name darf nicht leer sein' }
  for (const p of data.phases) {
    if (!p.name.trim()) return { error: 'Jede Phase braucht einen Namen' }
    if (p.defaultDurationHours <= 0) return { error: 'Phasendauer muss > 0 sein' }
  }
  for (const r of data.roleTemplates) {
    if (!r.title.trim()) return { error: 'Jede Rolle braucht einen Titel' }
    if (r.count < 1) return { error: 'Rollenanzahl muss ≥ 1 sein' }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  const { data: person } = await supabase
    .from('persons')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (person?.role !== 'owner') return { error: 'Keine Berechtigung' }

  const { error } = await supabase
    .from('production_templates')
    .update({
      name: data.name.trim(),
      phases: data.phases as unknown as Record<string, unknown>[],
      role_templates: data.roleTemplates.map(r => ({
        title: r.title.trim(),
        count: r.count,
        preferredPersonIds: [],
      })) as unknown as Record<string, unknown>[],
      default_venue_info: data.defaultVenueInfo,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/templates/${id}`)
}
```

- [ ] **Step 2: `createTemplateAction` erstellen**

Datei anlegen `app/(owner)/templates/new/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { TemplatePhase, RoleTemplate } from '@/lib/types'

export async function createTemplateAction(data: {
  name: string
  phases: TemplatePhase[]
  roleTemplates: RoleTemplate[]
  defaultVenueInfo: string
}): Promise<{ error: string } | void> {
  if (!data.name.trim()) return { error: 'Name darf nicht leer sein' }
  for (const p of data.phases) {
    if (!p.name.trim()) return { error: 'Jede Phase braucht einen Namen' }
    if (p.defaultDurationHours <= 0) return { error: 'Phasendauer muss > 0 sein' }
  }
  for (const r of data.roleTemplates) {
    if (!r.title.trim()) return { error: 'Jede Rolle braucht einen Titel' }
    if (r.count < 1) return { error: 'Rollenanzahl muss ≥ 1 sein' }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  const { data: person } = await supabase
    .from('persons')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (person?.role !== 'owner') return { error: 'Keine Berechtigung' }

  const { data: template, error } = await supabase
    .from('production_templates')
    .insert({
      name: data.name.trim(),
      phases: data.phases as unknown as Record<string, unknown>[],
      role_templates: data.roleTemplates.map(r => ({
        title: r.title.trim(),
        count: r.count,
        preferredPersonIds: [],
      })) as unknown as Record<string, unknown>[],
      default_venue_info: data.defaultVenueInfo,
    })
    .select('id')
    .single()

  if (error || !template) return { error: error?.message ?? 'Template konnte nicht erstellt werden' }

  redirect(`/templates/${template.id}`)
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(owner\)/templates/\[id\]/actions.ts app/\(owner\)/templates/new/actions.ts
git commit -m "feat: add updateTemplateAction and createTemplateAction"
```

---

## Task 2: `TemplateInlineEditor` — View-Modus

**Files:**
- Create: `app/(owner)/templates/[id]/inline-editor.tsx`
- Modify: `app/(owner)/templates/[id]/page.tsx`

- [ ] **Step 1: Client Component mit View-Modus anlegen**

Datei anlegen `app/(owner)/templates/[id]/inline-editor.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ProductionChip } from '@/components/ui/production-chip'
import { updateTemplateAction } from './actions'
import type { ProductionTemplate, TemplatePhase, RoleTemplate } from '@/lib/types'

interface TemplateInlineEditorProps {
  template: ProductionTemplate
  /** true = direkt im Edit-Modus starten (für /templates/new) */
  initialEditing?: boolean
  /** Server Action zum Speichern (update oder create) */
  onSave?: (data: {
    name: string
    phases: TemplatePhase[]
    roleTemplates: RoleTemplate[]
    defaultVenueInfo: string
  }) => Promise<{ error: string } | void>
  /** URL für «Abbrechen» im Create-Modus */
  cancelHref?: string
}

export function TemplateInlineEditor({
  template,
  initialEditing = false,
  onSave,
  cancelHref,
}: TemplateInlineEditorProps) {
  const [editing, setEditing] = useState(initialEditing)
  const [name, setName] = useState(template.name)
  const [phases, setPhases] = useState<TemplatePhase[]>(template.phases)
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>(template.roleTemplates)
  const [venueInfo, setVenueInfo] = useState(template.defaultVenueInfo)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function resetToTemplate() {
    setName(template.name)
    setPhases(template.phases)
    setRoleTemplates(template.roleTemplates)
    setVenueInfo(template.defaultVenueInfo)
    setServerError(null)
  }

  function handleCancel() {
    resetToTemplate()
    if (cancelHref) {
      window.location.href = cancelHref
    } else {
      setEditing(false)
    }
  }

  function handleSave() {
    const saveAction = onSave ?? ((data) => updateTemplateAction(template.id, data))
    startTransition(async () => {
      const result = await saveAction({ name, phases, roleTemplates, defaultVenueInfo: venueInfo })
      if (result?.error) {
        setServerError(result.error)
      } else {
        setEditing(false)
        setServerError(null)
      }
    })
  }

  // View-Modus
  if (!editing) {
    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="label-control text-muted-foreground mb-1">Template</p>
            <h1 className="text-2xl font-bold text-foreground" style={{ letterSpacing: '-0.02em' }}>
              {template.name}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>Bearbeiten</Button>
            <Button asChild>
              <a href={`/events/new?templateId=${template.id}`}>Event erstellen</a>
            </Button>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="label-control text-muted-foreground">Phasen</h2>
          <div className="space-y-2">
            {template.phases.map((phase, i) => (
              <div key={i} className="flex items-center justify-between ghost-border rounded-lg bg-level-1 px-5 py-3">
                <span className="font-medium text-foreground">{phase.name}</span>
                <span className="data-technical text-sm text-muted-foreground">{phase.defaultDurationHours} h</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="label-control text-muted-foreground">Rollen</h2>
          <div className="space-y-2">
            {template.roleTemplates.map((rt, i) => (
              <div key={i} className="flex items-center justify-between ghost-border rounded-lg bg-level-1 px-5 py-3">
                <div className="flex items-center gap-3">
                  <ProductionChip label={rt.title} />
                  {rt.count > 1 && (
                    <span className="data-technical text-xs text-muted-foreground">× {rt.count}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {template.defaultVenueInfo && (
          <section className="space-y-3">
            <h2 className="label-control text-muted-foreground">Standard-Venue-Info</h2>
            <div className="ghost-border rounded-lg bg-level-1 px-5 py-4 text-sm text-muted-foreground whitespace-pre-wrap">
              {template.defaultVenueInfo}
            </div>
          </section>
        )}
      </div>
    )
  }

  // Edit-Modus — wird in Task 3 ergänzt
  return <div>Edit-Modus folgt in Task 3</div>
}
```

- [ ] **Step 2: `page.tsx` anpassen — rendert `TemplateInlineEditor`**

`app/(owner)/templates/[id]/page.tsx` ersetzen:

```typescript
import { createClient } from '@/lib/supabase/server'
import { templateMapper } from '@/lib/supabase/mappers'
import { notFound } from 'next/navigation'
import { TemplateInlineEditor } from './inline-editor'

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('production_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (!row) notFound()
  const template = templateMapper.fromDb(row)

  return <TemplateInlineEditor template={template} />
}
```

- [ ] **Step 3: Im Browser testen**

`npm run dev` starten und `/templates/[id]` öffnen. View-Modus muss identisch zum bisherigen Stand aussehen. Button «Bearbeiten» ist sichtbar, zeigt aber noch «Edit-Modus folgt in Task 3».

- [ ] **Step 4: Commit**

```bash
git add app/\(owner\)/templates/\[id\]/inline-editor.tsx app/\(owner\)/templates/\[id\]/page.tsx
git commit -m "feat: extract TemplateInlineEditor with view mode"
```

---

## Task 3: `TemplateInlineEditor` — Edit-Modus

**Files:**
- Modify: `app/(owner)/templates/[id]/inline-editor.tsx`

- [ ] **Step 1: Edit-Modus implementieren**

Den Platzhalter `// Edit-Modus — wird in Task 3 ergänzt` in `inline-editor.tsx` ersetzen (alles ab `// View-Modus` bis Ende der Funktion bleibt, nur das `return <div>Edit...` ersetzen):

```typescript
  // Edit-Modus
  return (
    <div className="space-y-8">
      {/* Header mit Name-Input und Aktionen */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="label-control text-muted-foreground mb-1">Name</p>
          <input
            className="w-full rounded-lg bg-level-1 ghost-border px-4 py-2 text-xl font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-white/20"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Template-Name"
          />
        </div>
        <div className="flex gap-2 pt-6">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Speichern…' : 'Speichern'}
          </Button>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            Abbrechen
          </Button>
        </div>
      </div>

      {serverError && (
        <p className="text-sm text-red-400">{serverError}</p>
      )}

      {/* Phasen */}
      <section className="space-y-3">
        <h2 className="label-control text-muted-foreground">Phasen</h2>
        <div className="space-y-2">
          {phases.map((phase, i) => (
            <div key={i} className="flex items-center gap-2 ghost-border rounded-lg bg-level-1 px-4 py-2">
              <input
                className="flex-1 bg-transparent text-foreground focus:outline-none"
                value={phase.name}
                onChange={e => setPhases(prev => prev.map((p, j) => j === i ? { ...p, name: e.target.value } : p))}
                placeholder="Phasenname"
              />
              <input
                type="number"
                min={0.5}
                step={0.5}
                className="w-14 bg-transparent text-center text-foreground focus:outline-none data-technical"
                value={phase.defaultDurationHours}
                onChange={e => setPhases(prev => prev.map((p, j) => j === i ? { ...p, defaultDurationHours: parseFloat(e.target.value) || 0 } : p))}
              />
              <span className="text-xs text-muted-foreground">h</span>
              <button
                className="text-muted-foreground hover:text-foreground transition-colors px-1"
                onClick={() => setPhases(prev => prev.filter((_, j) => j !== i))}
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          className="label-control text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setPhases(prev => [...prev, { name: '', defaultDurationHours: 1 }])}
          type="button"
        >
          + Phase hinzufügen
        </button>
      </section>

      {/* Rollen */}
      <section className="space-y-3">
        <h2 className="label-control text-muted-foreground">Rollen</h2>
        <div className="space-y-2">
          {roleTemplates.map((rt, i) => (
            <div key={i} className="flex items-center gap-2 ghost-border rounded-lg bg-level-1 px-4 py-2">
              <input
                className="flex-1 bg-transparent text-foreground focus:outline-none"
                value={rt.title}
                onChange={e => setRoleTemplates(prev => prev.map((r, j) => j === i ? { ...r, title: e.target.value } : r))}
                placeholder="Rollenbezeichnung"
              />
              <input
                type="number"
                min={1}
                step={1}
                className="w-12 bg-transparent text-center text-foreground focus:outline-none data-technical"
                value={rt.count}
                onChange={e => setRoleTemplates(prev => prev.map((r, j) => j === i ? { ...r, count: parseInt(e.target.value) || 1 } : r))}
              />
              <span className="text-xs text-muted-foreground">×</span>
              <button
                className="text-muted-foreground hover:text-foreground transition-colors px-1"
                onClick={() => setRoleTemplates(prev => prev.filter((_, j) => j !== i))}
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          className="label-control text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setRoleTemplates(prev => [...prev, { title: '', count: 1, preferredPersonIds: [] }])}
          type="button"
        >
          + Rolle hinzufügen
        </button>
      </section>

      {/* Venue-Info */}
      <section className="space-y-3">
        <h2 className="label-control text-muted-foreground">Standard-Venue-Info</h2>
        <textarea
          className="w-full rounded-lg bg-level-1 ghost-border px-5 py-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
          rows={4}
          value={venueInfo}
          onChange={e => setVenueInfo(e.target.value)}
          placeholder="Adresse, Parkplatz, Zugangsinformationen…"
        />
      </section>
    </div>
  )
```

- [ ] **Step 2: Im Browser testen**

«Bearbeiten» klicken → Edit-Formular erscheint. Felder editieren, «Abbrechen» → Änderungen verworfen, View zurück. «Speichern» → Daten gespeichert, View aktualisiert. Fehler (leerer Name) → Fehlermeldung erscheint.

- [ ] **Step 3: Commit**

```bash
git add app/\(owner\)/templates/\[id\]/inline-editor.tsx
git commit -m "feat: add edit mode to TemplateInlineEditor"
```

---

## Task 4: Templates-Liste — Neues-Template-Button und Duplizieren

**Files:**
- Modify: `app/(owner)/templates/page.tsx`

- [ ] **Step 1: Button und Duplizieren-Link hinzufügen**

`app/(owner)/templates/page.tsx` ersetzen:

```typescript
import { createClient } from '@/lib/supabase/server'
import { templateMapper } from '@/lib/supabase/mappers'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('production_templates')
    .select('*')
    .order('created_at', { ascending: false })

  const templates = (rows ?? []).map(templateMapper.fromDb)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-control text-muted-foreground mb-1">Vorlagen</p>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ letterSpacing: '-0.02em' }}
          >
            Templates
          </h1>
        </div>
        <Button asChild>
          <Link href="/templates/new">+ Neues Template</Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="ghost-border rounded-lg bg-level-2 p-12 text-center text-muted-foreground text-sm">
          Keine Templates vorhanden.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(template => (
            <div
              key={template.id}
              className="flex items-center justify-between ghost-border rounded-lg bg-level-1 px-5 py-4"
            >
              <Link
                href={`/templates/${template.id}`}
                className="flex-1 space-y-0.5 hover:opacity-80 transition-opacity"
              >
                <p className="font-medium text-foreground">{template.name}</p>
                <p className="data-technical text-xs text-muted-foreground">
                  {template.roleTemplates.reduce((sum, rt) => sum + rt.count, 0)} Rollen · {template.phases.length} Phasen
                </p>
              </Link>
              <div className="flex items-center gap-4">
                <Link
                  href={`/templates/new?from=${template.id}`}
                  className="label-control text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Duplizieren
                </Link>
                <Link
                  href={`/templates/${template.id}`}
                  className="label-control text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Im Browser testen**

`/templates` öffnen → «+ Neues Template»-Button oben rechts sichtbar. Pro Template: «Duplizieren»-Link. «Details →» navigiert korrekt. Klick auf Template-Name/Inhalt navigiert ebenfalls zur Detailseite.

- [ ] **Step 3: Commit**

```bash
git add app/\(owner\)/templates/page.tsx
git commit -m "feat: add new template button and duplicate link to templates list"
```

---

## Task 5: Neue Template-Seite (`/templates/new`)

**Files:**
- Create: `app/(owner)/templates/new/page.tsx`

- [ ] **Step 1: Server Component anlegen**

Datei anlegen `app/(owner)/templates/new/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { templateMapper } from '@/lib/supabase/mappers'
import { TemplateInlineEditor } from '@/app/(owner)/templates/[id]/inline-editor'
import { createTemplateAction } from './actions'
import type { ProductionTemplate } from '@/lib/types'

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams

  let baseTemplate: ProductionTemplate = {
    id: '',
    name: '',
    phases: [],
    roleTemplates: [],
    defaultVenueInfo: '',
    createdAt: '',
  }

  if (from) {
    const supabase = await createClient()
    const { data: row } = await supabase
      .from('production_templates')
      .select('*')
      .eq('id', from)
      .single()

    if (row) {
      const source = templateMapper.fromDb(row)
      baseTemplate = {
        ...source,
        id: '',
        name: `${source.name} (Kopie)`,
        createdAt: '',
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="label-control text-muted-foreground mb-1">Vorlagen</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ letterSpacing: '-0.02em' }}>
          {from ? 'Template duplizieren' : 'Neues Template'}
        </h1>
      </div>
      <TemplateInlineEditor
        template={baseTemplate}
        initialEditing={true}
        onSave={createTemplateAction}
        cancelHref="/templates"
      />
    </div>
  )
}
```

- [ ] **Step 2: Im Browser testen — von Scratch**

`/templates/new` öffnen → leeres Formular im Edit-Modus, Titel «Neues Template». Felder ausfüllen, «Speichern» → Redirect zu `/templates/[neue-id]`, Template erscheint dort im View-Modus.

- [ ] **Step 3: Im Browser testen — Duplizieren**

Auf `/templates` «Duplizieren» klicken → `/templates/new?from=[id]` → Formular vorausgefüllt mit Quell-Daten, Name = «[Original] (Kopie)». Speichern → neues Template mit eigenem Datensatz.

- [ ] **Step 4: «Abbrechen» im Create-Modus testen**

«Abbrechen» auf `/templates/new` → Redirect zu `/templates`.

- [ ] **Step 5: Commit**

```bash
git add app/\(owner\)/templates/new/page.tsx
git commit -m "feat: add new template page with create and duplicate support"
```

---

## Task 6: Build-Check und Smoke-Test

**Files:** keine neuen

- [ ] **Step 1: Build prüfen**

```bash
npm run build
```

Erwartete Ausgabe: keine TypeScript-Fehler, kein Compiler-Fehler. Warnungen über ungenutzte Variablen sind kein Blocker, müssen aber behoben werden falls vorhanden.

- [ ] **Step 2: Existierende Tests grün**

```bash
npm test
```

Erwartete Ausgabe: alle 39 Tests grün. (Keine neuen Tests nötig — die neue Logik liegt in Server Actions und Client Components; reine Utility-Funktionen wurden nicht hinzugefügt.)

- [ ] **Step 3: End-to-End Smoke-Test**

Als Owner einloggen und manuell prüfen:

1. `/templates` → «+ Neues Template» sichtbar, «Duplizieren» pro Zeile
2. Neues Template von Scratch: `/templates/new` → ausfüllen → speichern → Redirect → View-Modus korrekt
3. Template bearbeiten: auf Detailseite «Bearbeiten» → Felder ändern → «Speichern» → Änderungen sichtbar
4. Abbrechen: «Bearbeiten» → Felder ändern → «Abbrechen» → Änderungen verworfen
5. Duplizieren: «Duplizieren» auf Liste → vorausgefülltes Formular → Speichern → neues Template
6. Fehlerfall: leeren Namen speichern → Fehlermeldung «Name darf nicht leer sein»
7. Bestehende Events auf `/events` prüfen — unverändert

- [ ] **Step 4: Final Commit**

```bash
git add -A
git commit -m "feat: template editing and creation complete"
```
