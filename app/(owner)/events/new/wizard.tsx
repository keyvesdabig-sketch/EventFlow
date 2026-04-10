'use client'

import { useState, useTransition } from 'react'
import { CalendarIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
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
  eventDate: string
  phases: ConcretePhase[]
  venue: Venue
  notes: string
}

const emptyVenue: Venue = {
  name: '', address: '', gpsLat: 0, gpsLng: 0, parkingInfo: '', accessInfo: '',
}

export function EventWizard({ templates, initialTemplateId }: WizardProps) {
  const router = useRouter()
  const initialTemplate = initialTemplateId
    ? (templates.find(t => t.id === initialTemplateId) ?? null)
    : null

  const [step, setStep] = useState<Step>(initialTemplate ? 2 : 1)
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    selectedTemplate: initialTemplate,
    title: initialTemplate?.name ?? '',
    eventDate: new Date().toISOString().split('T')[0],
    phases: initialTemplate?.phases.map(p => ({ name: p.name, startTime: '', endTime: '' })) ?? [],
    venue: emptyVenue,
    notes: '',
  })

  function selectTemplate(template: ProductionTemplate) {
    setForm({
      selectedTemplate: template,
      title: template.name,
      eventDate: form.eventDate || new Date().toISOString().split('T')[0],
      phases: template.phases.map(p => ({ name: p.name, startTime: '', endTime: '' })),
      venue: emptyVenue,
      notes: '',
    })
    setStep(2)
  }

  function updatePhase(index: number, field: 'startTime' | 'endTime', value: string) {
    setForm(f => {
      const phases = [...f.phases]
      const updatedPhase = { ...phases[index], [field]: value }

      if (field === 'startTime' && value && f.selectedTemplate) {
        const durationHours = f.selectedTemplate.phases[index]?.defaultDurationHours || 0
        if (durationHours > 0) {
          const [h, m] = value.split(':').map(Number)
          const totalMinutes = h * 60 + m + Math.round(durationHours * 60)
          const endH = Math.floor(totalMinutes / 60) % 24
          const endM = totalMinutes % 60
          updatedPhase.endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
        }
      }

      phases[index] = updatedPhase
      return { ...f, phases }
    })
  }

  function step2Valid(): boolean {
    return form.title.trim().length > 0 && form.eventDate !== ''
  }

  function combineDateTime(baseDate: string, timeStr: string, addDays = 0) {
    if (!baseDate || !timeStr) return ''
    const d = new Date(baseDate)
    d.setDate(d.getDate() + addDays)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    // timeStr is HH:mm
    return `${yyyy}-${mm}-${dd}T${timeStr}`
  }

  function handleSubmit() {
    if (!form.selectedTemplate) return
    setServerError(null)
    
    let currentAddDays = 0
    let lastTimeMinutes = -1

    function timeToMinutes(t: string) {
      if (!t) return 0
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }

    const processedPhases = form.phases.map(p => {
      let combinedStart = ''
      let combinedEnd = ''
      
      if (p.startTime) {
        const startMin = timeToMinutes(p.startTime)
        // Midnight rollover: new start is in early hours (<06:00) after a late time (>18:00)
        if (lastTimeMinutes !== -1 && startMin < 6 * 60 && lastTimeMinutes > 18 * 60) {
          currentAddDays++
        }
        combinedStart = combineDateTime(form.eventDate, p.startTime, currentAddDays)
        lastTimeMinutes = startMin
      }

      if (p.endTime) {
        const endMin = timeToMinutes(p.endTime)
        // Midnight rollover: end is in early hours (<06:00) after a late start (>18:00)
        if (endMin < 6 * 60 && lastTimeMinutes > 18 * 60) {
          currentAddDays++
        }
        combinedEnd = combineDateTime(form.eventDate, p.endTime, currentAddDays)
        lastTimeMinutes = endMin
      }

      return {
        name: p.name,
        startTime: combinedStart,
        endTime: combinedEnd
      }
    })

    startTransition(async () => {
      const result = await createEventAction({
        templateId: form.selectedTemplate!.id,
        title: form.title,
        phases: processedPhases,
        venue: form.venue,
        notes: form.notes,
        roleTemplates: form.selectedTemplate!.roleTemplates,
      })
      if (result && result.error) {
        setServerError(result.error)
      } else if (result && result.eventId) {
        router.push(`/events/${result.eventId}`)
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
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
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
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <div>
            <p className="label-control text-muted-foreground mb-1">Schritt 2 / 3</p>
            <h2 className="text-xl font-bold text-foreground">Datum &amp; Zeiten</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label-control text-muted-foreground text-xs">Event-Titel</label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="z. B. EHC Chur vs. HC Davos"
              />
            </div>
            <div className="space-y-2">
              <label className="label-control text-muted-foreground text-xs">Event-Datum</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-border/50 bg-background/50",
                      !form.eventDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.eventDate ? (
                      new Date(form.eventDate).toLocaleDateString('de-CH', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' })
                    ) : (
                      <span>Datum wählen</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[310px] p-0 border border-white/5 bg-level-2/95 backdrop-blur-xl shadow-2xl rounded-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={form.eventDate ? new Date(form.eventDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const yyyy = date.getFullYear()
                        const mm = String(date.getMonth() + 1).padStart(2, '0')
                        const dd = String(date.getDate()).padStart(2, '0')
                        setForm(f => ({ ...f, eventDate: `${yyyy}-${mm}-${dd}` }))
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-4">
            {form.phases.map((phase, i) => (
              <div key={i} className="ghost-border rounded-lg bg-level-1 p-4 space-y-3">
                <p className="label-control text-foreground text-xs">{phase.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="label-control text-muted-foreground text-xs">Start-Zeit</label>
                    <Input
                      type="time"
                      value={form.phases[i].startTime}
                      onChange={e => updatePhase(i, 'startTime', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="label-control text-muted-foreground text-xs">End-Zeit</label>
                    <Input
                      type="time"
                      value={form.phases[i].endTime}
                      onChange={e => updatePhase(i, 'endTime', e.target.value)}
                    />
                  </div>
                </div>
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
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
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
              className="flex min-h-[80px] w-full rounded-md border border-white/10 bg-background/20 backdrop-blur-md px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:border-white/30 focus-visible:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300 resize-none"
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
