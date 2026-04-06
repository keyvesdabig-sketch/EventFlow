import { describe, it, expect } from 'vitest'
import { personMapper, templateMapper, eventMapper, roleMapper, bookingMapper } from '@/lib/supabase/mappers'

describe('personMapper.fromDb', () => {
  it('mapped camelCase Felder korrekt', () => {
    const row = {
      id: 'p1', user_id: 'u1', name: 'Max Müller', phone: '+41791234567',
      email: 'max@example.com', photo_url: null, skills: ['camera', 'evs'],
      notes: 'Notiz', role: 'freelancer', created_at: '2026-01-01T00:00:00Z',
    }
    const result = personMapper.fromDb(row as any)
    expect(result.userId).toBe('u1')
    expect(result.photoUrl).toBeNull()
    expect(result.skills).toEqual(['camera', 'evs'])
    expect(result.createdAt).toBe('2026-01-01T00:00:00Z')
  })
})

describe('templateMapper.fromDb', () => {
  it('parst JSONB-Felder korrekt', () => {
    const row = {
      id: 't1', name: 'NL2 Heimspiel',
      phases: [{ name: 'Rigging', defaultDurationHours: 4 }],
      role_templates: [{ title: 'EVS-Operator', count: 1, preferredPersonIds: [] }],
      default_venue_info: 'Eingang Nord', created_at: '2026-01-01T00:00:00Z',
    }
    const result = templateMapper.fromDb(row as any)
    expect(result.phases[0].name).toBe('Rigging')
    expect(result.roleTemplates[0].title).toBe('EVS-Operator')
    expect(result.defaultVenueInfo).toBe('Eingang Nord')
  })
})

describe('eventMapper.fromDb', () => {
  it('parst JSONB venue und phases', () => {
    const row = {
      id: 'e1', template_id: 't1', title: 'EHC Chur vs. HC Davos',
      phases: [{ name: 'Live', startTime: '2026-04-12T15:00:00Z', endTime: '2026-04-12T22:00:00Z' }],
      venue: { name: 'Eissporthalle', address: 'Str. 1', gpsLat: 46.8, gpsLng: 9.5, parkingInfo: 'P1', accessInfo: 'Tor A' },
      status: 'draft', documents: [], notes: '',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    }
    const result = eventMapper.fromDb(row as any)
    expect(result.status).toBe('draft')
    expect(result.venue.name).toBe('Eissporthalle')
    expect(result.phases[0].startTime).toBe('2026-04-12T15:00:00Z')
  })
})

describe('roleMapper.fromDb', () => {
  it('mapped eventId und assignedPersonId', () => {
    const row = { id: 'r1', event_id: 'e1', title: 'Kameramann 1', assigned_person_id: null, created_at: '2026-01-01T00:00:00Z' }
    const result = roleMapper.fromDb(row as any)
    expect(result.eventId).toBe('e1')
    expect(result.assignedPersonId).toBeNull()
  })
})

describe('bookingMapper.fromDb', () => {
  it('mapped snake_case zu camelCase', () => {
    const row = {
      id: 'b1', role_id: 'r1', person_id: 'p1', status: 'sent',
      requested_at: '2026-01-01T00:00:00Z', responded_at: null, decline_reason: null,
      created_at: '2026-01-01T00:00:00Z',
    }
    const result = bookingMapper.fromDb(row as any)
    expect(result.roleId).toBe('r1')
    expect(result.respondedAt).toBeNull()
  })
})
