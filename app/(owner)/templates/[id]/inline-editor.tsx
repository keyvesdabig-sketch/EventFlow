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

  // Edit-Modus — wird in Task 3 ergänzt
  return <div>Edit-Modus folgt in Task 3</div>
}
