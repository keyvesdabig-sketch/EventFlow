'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createEventAction } from './actions'
import type { ProductionTemplate, ConcretePhase, Venue } from '@/lib/types'

interface WizardProps {
  templates: ProductionTemplate[]
  initialTemplateId?: string
}

type Step = 1 | 2 | 3

interface FormState {
  selectedTemplate: ProductionTemplate | null
  title: string
  phases: ConcretePhase[]
  venue: Venue
  notes: string
}

const emptyVenue: Venue = {
  name: '', address: '', gpsLat: 0, gpsLng: 0, parkingInfo: '', accessInfo: '',
}

export function EventWizard({ templates, initialTemplateId }: WizardProps) {
  const initialTemplate = initialTemplateId
    ? (templates.find(t => t.id === initialTemplateId) ?? null)
    : null

  const [step, setStep] = useState<Step>(initialTemplate ? 2 : 1)
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    selectedTemplate: initialTemplate,
    title: initialTemplate?.name ?? '',
    phases: initialTemplate?.phases.map(p => ({ name: p.name, startTime: '', endTime: '' })) ?? [],
    venue: emptyVenue,
    notes: '',
  })

  function selectTemplate(template: ProductionTemplate) {
    setForm({
      selectedTemplate: template,
      title: template.name,
      phases: template.phases.map(p => ({ name: p.name, startTime: '', endTime: '' })),
      venue: emptyVenue,
      notes: '',
    })
    setStep(2)
  }

  function updatePhase(index: number, field: 'startTime' | 'endTime', value: string) {
    setForm(f => {
      const phases = [...f.phases]
      phases[index] = { ...phases[index], [field]: value }
      return { ...f, phases }
    })
  }

  function step2Valid(): boolean {
    return (
      form.title.trim().length > 0 &&
      form.phases.every(p => p.startTime && p.endTime && p.endTime > p.startTime)
    )
  }

  function handleSubmit() {
    if (!form.selectedTemplate) return
    setServerError(null)
    startTransition(async () => {
      const result = await createEventAction({
        templateId: form.selectedTemplate!.id,
        title: form.title,
        phases: form.phases,
        venue: form.venue,
        notes: form.notes,
        roleTemplates: form.selectedTemplate!.roleTemplates,
      })
      if (result && 'error' in result) {
        setServerError(result.error)
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as Step[]).map(s => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-signal-green' : 'bg-level-3'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Template selection */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <p className="label-control text-muted-foreground mb-1">Schritt 1 / 3</p>
            <h2 className="text-xl font-bold text-foreground">Template wählen</h2>
          </div>
          <div className="space-y-2">
            {templates.map(template => (
              <button
                key={template.id}
                onClick={() => selectTemplate(template)}
                className="w-full text-left ghost-border rounded-lg bg-level-1 px-5 py-4 hover:bg-level-2 transition-colors"
              >
                <p className="font-medium text-foreground">{template.name}</p>
                <p className="data-technical text-xs text-muted-foreground mt-0.5">
                  {template.roleTemplates.reduce((sum, rt) => sum + rt.count, 0)} Rollen ·{' '}
                  {template.phases.length} Phasen
                </p>
              </button>
            ))}
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground">Keine Templates vorhanden.</p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Title + phases */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <p className="label-control text-muted-foreground mb-1">Schritt 2 / 3</p>
            <h2 className="text-xl font-bold text-foreground">Datum &amp; Zeiten</h2>
          </div>

          <div className="space-y-2">
            <label className="label-control text-muted-foreground text-xs">Event-Titel</label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="z. B. EHC Chur vs. HC Davos"
            />
          </div>

          <div className="space-y-4">
            {form.phases.map((phase, i) => (
              <div key={i} className="ghost-border rounded-lg bg-level-1 p-4 space-y-3">
                <p className="label-control text-foreground text-xs">{phase.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="label-control text-muted-foreground text-xs">Start</label>
                    <Input
                      type="datetime-local"
                      value={phase.startTime}
                      onChange={e => updatePhase(i, 'startTime', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="label-control text-muted-foreground text-xs">Ende</label>
                    <Input
                      type="datetime-local"
                      value={phase.endTime}
                      onChange={e => updatePhase(i, 'endTime', e.target.value)}
                    />
                  </div>
                </div>
                {phase.startTime && phase.endTime && phase.endTime <= phase.startTime && (
                  <p className="text-xs text-tally-red">Ende muss nach Start liegen.</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>
              Zurück
            </Button>
            <Button onClick={() => setStep(3)} disabled={!step2Valid()}>
              Weiter
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Venue + notes */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <p className="label-control text-muted-foreground mb-1">Schritt 3 / 3</p>
            <h2 className="text-xl font-bold text-foreground">Venue &amp; Notizen</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="label-control text-muted-foreground text-xs">Venue-Name</label>
              <Input
                value={form.venue.name}
                onChange={e => setForm(f => ({ ...f, venue: { ...f.venue, name: e.target.value } }))}
                placeholder="Eissportzentrum Chur"
              />
            </div>
            <div className="space-y-1">
              <label className="label-control text-muted-foreground text-xs">Adresse</label>
              <Input
                value={form.venue.address}
                onChange={e => setForm(f => ({ ...f, venue: { ...f.venue, address: e.target.value } }))}
                placeholder="Güterstrasse 5, 7000 Chur"
              />
            </div>
            <div className="space-y-1">
              <label className="label-control text-muted-foreground text-xs">Parkplatz-Info</label>
              <Input
                value={form.venue.parkingInfo}
                onChange={e => setForm(f => ({ ...f, venue: { ...f.venue, parkingInfo: e.target.value } }))}
                placeholder="Eingang Nord, Tor B"
              />
            </div>
            <div className="space-y-1">
              <label className="label-control text-muted-foreground text-xs">Zufahrt / Zugang</label>
              <Input
                value={form.venue.accessInfo}
                onChange={e => setForm(f => ({ ...f, venue: { ...f.venue, accessInfo: e.target.value } }))}
                placeholder="Ü-Wagen Tor A"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="label-control text-muted-foreground text-xs">Notizen (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Besonderheiten, Hinweise..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {serverError && (
            <p className="text-sm text-tally-red">{serverError}</p>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} disabled={isPending}>
              Zurück
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Wird gespeichert…' : 'Als Entwurf speichern'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
