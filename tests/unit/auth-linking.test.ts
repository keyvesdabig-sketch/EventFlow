import { describe, it, expect, vi } from 'vitest'
import { linkPersonToUser } from '@/lib/auth-linking'

function makeSupabase(personRow: { id: string; user_id: string | null } | null) {
  const eqUpdate = vi.fn().mockResolvedValue({ error: null })
  const supabase = {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: personRow, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: eqUpdate,
      })),
    })),
    _eqUpdate: eqUpdate,
  }
  return supabase
}

describe('linkPersonToUser', () => {
  it('gibt "no_person" zurück wenn kein Match per E-Mail', async () => {
    const supabase = makeSupabase(null)
    const result = await linkPersonToUser(supabase as any, 'uid1', 'unknown@x.com')
    expect(result).toBe('no_person')
  })

  it('gibt "already_linked" zurück wenn user_id bereits gesetzt', async () => {
    const supabase = makeSupabase({ id: 'p1', user_id: 'existing-uid' })
    const result = await linkPersonToUser(supabase as any, 'uid1', 'max@x.com')
    expect(result).toBe('already_linked')
  })

  it('gibt "linked" zurück und führt UPDATE aus wenn user_id null', async () => {
    const supabase = makeSupabase({ id: 'p1', user_id: null })
    const result = await linkPersonToUser(supabase as any, 'uid1', 'max@x.com')
    expect(result).toBe('linked')
    expect(supabase.from).toHaveBeenCalledWith('persons')
  })
})
