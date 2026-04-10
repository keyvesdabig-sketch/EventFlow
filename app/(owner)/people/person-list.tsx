'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ProductionChip } from '@/components/ui/production-chip'
import {
  updatePersonAction,
  deletePersonAction,
  createPersonAction,
  generateAndSendInviteLinkAction,
} from './actions'
import type { Person, Skill } from '@/lib/types'

const SKILL_LABELS: Record<Skill, string> = {
  camera: 'Kamera',
  evs: 'EVS',
  audio: 'Audio',
  vision_mixing: 'Bildmischer',
  rf_tech: 'RF-Tech',
  replay: 'Replay',
  graphics: 'Grafik',
}

const ALL_SKILLS = Object.keys(SKILL_LABELS) as Skill[]

export function PersonList({ persons }: { persons: Person[] }) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  function toggleExpand(id: string) {
    setExpandedId(prev => (prev === id ? null : id))
  }

  function handleSaved() {
    setExpandedId(null)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {persons.map(person => (
        <PersonRow
          key={person.id}
          person={person}
          isExpanded={expandedId === person.id}
          onToggle={() => toggleExpand(person.id)}
          onSaved={handleSaved}
        />
      ))}

      {persons.length === 0 && !showInviteForm && (
        <p className="text-sm text-muted-foreground">Noch keine Freelancer eingetragen.</p>
      )}

      {!showInviteForm ? (
        <button
          type="button"
          onClick={() => { setShowInviteForm(true); setInviteLink(null) }}
          className="label-control text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
        >
          + Neuer Freelancer
        </button>
      ) : (
        <InviteForm
          onCancel={() => setShowInviteForm(false)}
          onCreated={(link) => {
            setInviteLink(link)
            setShowInviteForm(false)
            router.refresh()
          }}
        />
      )}

      {inviteLink && (
        <div className="rounded-xl border border-signal-green/30 bg-signal-green/5 px-5 py-4 space-y-2">
          <p className="text-sm font-semibold text-signal-green">Login-Link generiert</p>
          <p className="text-xs text-muted-foreground">
            Per WhatsApp oder E-Mail weiterleiten. Gültig 1 Stunde.
            Der Link wurde auch an deine E-Mail gesendet.
          </p>
          <div className="flex items-start gap-2">
            <code className="text-xs text-foreground bg-level-2 rounded px-2 py-1 break-all flex-1">
              {inviteLink}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(inviteLink)}
              className="label-control text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1"
            >
              Kopieren
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PersonRow({
  person,
  isExpanded,
  onToggle,
  onSaved,
}: {
  person: Person
  isExpanded: boolean
  onToggle: () => void
  onSaved: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [name, setName] = useState(person.name)
  const [email, setEmail] = useState(person.email)
  const [phone, setPhone] = useState(person.phone)
  const [skills, setSkills] = useState<Skill[]>(person.skills)
  const [notes, setNotes] = useState(person.notes)

  const rowId = `person-${person.id}`

  function toggleSkill(skill: Skill) {
    setSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill],
    )
  }

  function handleSave() {
    startTransition(async () => {
      setLocalError(null)
      const result = await updatePersonAction(person.id, { name, email, phone, skills, notes })
      if (result?.error) { setLocalError(result.error); return }
      onSaved()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      setLocalError(null)
      const result = await deletePersonAction(person.id)
      if (result?.error) { setLocalError(result.error); return }
      onSaved()
    })
  }

  function handleCancel() {
    setName(person.name)
    setEmail(person.email)
    setPhone(person.phone)
    setSkills(person.skills)
    setNotes(person.notes)
    setConfirmDelete(false)
    setLocalError(null)
    onToggle()
  }

  return (
    <div className="rounded-xl border border-white/5 bg-background/40 backdrop-blur-xl shadow-lg hover:border-white/10 transition-colors">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          <span className="font-medium truncate">{person.name}</span>
          <span className="text-sm text-muted-foreground hidden sm:block truncate">{person.email}</span>
          <span className="text-sm text-muted-foreground hidden md:block">{person.phone}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {person.skills.slice(0, 3).map(skill => (
            <ProductionChip key={skill} label={SKILL_LABELS[skill] ?? skill} />
          ))}
          {person.skills.length > 3 && (
            <span className="text-xs text-muted-foreground">+{person.skills.length - 3}</span>
          )}
          <span className="text-muted-foreground ml-1">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor={`${rowId}-name`} className="label-control text-xs text-muted-foreground">Name *</label>
              <input
                id={`${rowId}-name`}
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-level-2 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${rowId}-email`} className="label-control text-xs text-muted-foreground">E-Mail *</label>
              <input
                id={`${rowId}-email`}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-level-2 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${rowId}-phone`} className="label-control text-xs text-muted-foreground">Telefon</label>
              <input
                id={`${rowId}-phone`}
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-level-2 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="label-control text-xs text-muted-foreground">Skills</p>
            <div className="flex flex-wrap gap-2">
              {ALL_SKILLS.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    skills.includes(skill)
                      ? 'border-signal-green/50 bg-signal-green/10 text-signal-green'
                      : 'ghost-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {SKILL_LABELS[skill]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor={`${rowId}-notes`} className="label-control text-xs text-muted-foreground">Notizen</label>
            <textarea
              id={`${rowId}-notes`}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-level-2 px-3 py-2 text-sm focus:outline-none focus:border-white/30 resize-none"
            />
          </div>

          {localError && <p className="text-sm text-tally-red">{localError}</p>}

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-3">
              <Button type="button" onClick={handleSave} disabled={isPending}>
                {isPending ? 'Wird gespeichert…' : 'Speichern'}
              </Button>
              <Button type="button" variant="ghost" onClick={handleCancel} disabled={isPending}>
                Abbrechen
              </Button>
            </div>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="label-control text-xs text-tally-red hover:text-foreground transition-colors"
              >
                Löschen
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-tally-red">Wirklich löschen?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="label-control text-xs text-tally-red hover:text-foreground transition-colors"
                >
                  Ja
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="label-control text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Nein
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InviteForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void
  onCreated: (link: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [localError, setLocalError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [skills, setSkills] = useState<Skill[]>([])

  function toggleSkill(skill: Skill) {
    setSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill],
    )
  }

  function handleSubmit() {
    startTransition(async () => {
      setLocalError(null)
      const createResult = await createPersonAction({ name, email, phone, skills })
      if ('error' in createResult) { setLocalError(createResult.error); return }

      const linkResult = await generateAndSendInviteLinkAction(email)
      if ('error' in linkResult) { setLocalError(linkResult.error); return }

      onCreated(linkResult.link)
    })
  }

  return (
    <div className="rounded-xl border border-white/10 bg-background/40 backdrop-blur-xl px-5 py-5 space-y-4 mt-2">
      <h3 className="font-semibold text-sm">Neuer Freelancer</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="invite-name" className="label-control text-xs text-muted-foreground">Name *</label>
          <input
            id="invite-name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-level-2 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="invite-email" className="label-control text-xs text-muted-foreground">E-Mail *</label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-level-2 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="invite-phone" className="label-control text-xs text-muted-foreground">Telefon</label>
          <input
            id="invite-phone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-level-2 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="label-control text-xs text-muted-foreground">Skills</p>
        <div className="flex flex-wrap gap-2">
          {ALL_SKILLS.map(skill => (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                skills.includes(skill)
                  ? 'border-signal-green/50 bg-signal-green/10 text-signal-green'
                  : 'ghost-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {SKILL_LABELS[skill]}
            </button>
          ))}
        </div>
      </div>

      {localError && <p className="text-sm text-tally-red">{localError}</p>}

      <div className="flex gap-3 pt-1">
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Wird erstellt…' : 'Erstellen & Link generieren'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Abbrechen
        </Button>
      </div>
    </div>
  )
}
