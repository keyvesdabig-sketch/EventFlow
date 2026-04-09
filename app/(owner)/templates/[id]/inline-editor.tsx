'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
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
      router.push(cancelHref)
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
            {template.phases.map((phase) => (
              <div key={phase.name} className="flex items-center justify-between ghost-border rounded-lg bg-level-1 px-5 py-3">
                <span className="font-medium text-foreground">{phase.name}</span>
                <span className="data-technical text-sm text-muted-foreground">{phase.defaultDurationHours} h</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="label-control text-muted-foreground">Rollen</h2>
          <div className="space-y-2">
            {template.roleTemplates.map((rt) => (
              <div key={rt.title} className="flex items-center justify-between ghost-border rounded-lg bg-level-1 px-5 py-3">
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
            <div key={phase.name || i} className="flex items-center gap-2 ghost-border rounded-lg bg-level-1 px-4 py-2">
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
                title="Dauer in Stunden"
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
            <div key={rt.title || i} className="flex items-center gap-2 ghost-border rounded-lg bg-level-1 px-4 py-2">
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
                title="Anzahl Personen"
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
}
