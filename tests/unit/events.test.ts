import { describe, it, expect } from 'vitest'
import { materializeRoles } from '@/lib/events'

describe('materializeRoles', () => {
  it('erstellt eine Role-Row pro count', () => {
    const roles = materializeRoles('event-1', [
      { title: 'Kameramann', count: 2, preferredPersonIds: [] },
      { title: 'EVS-Operator', count: 1, preferredPersonIds: [] },
    ])
    expect(roles).toHaveLength(3)
    expect(roles.filter(r => r.title === 'Kameramann')).toHaveLength(2)
    expect(roles.filter(r => r.title === 'EVS-Operator')).toHaveLength(1)
  })

  it('setzt event_id auf alle Rows', () => {
    const roles = materializeRoles('event-42', [
      { title: 'Toningenieur', count: 1, preferredPersonIds: [] },
    ])
    expect(roles[0].event_id).toBe('event-42')
  })

  it('gibt leeres Array für leere roleTemplates zurück', () => {
    const roles = materializeRoles('event-1', [])
    expect(roles).toHaveLength(0)
  })
})
