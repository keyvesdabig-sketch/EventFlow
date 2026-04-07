import { describe, it, expect } from 'vitest'
import {
  getRoleBookingStatus,
  checkAllRolesConfirmed,
} from '@/lib/bookings'
import type { Booking, Role } from '@/lib/types'

function makeBooking(overrides: Partial<Booking> & { roleId: string; status: Booking['status'] }): Booking {
  return {
    id: 'b1', personId: 'p1', requestedAt: '2026-04-07T10:00:00Z',
    respondedAt: null, declineReason: null, createdAt: '2026-04-07T10:00:00Z',
    ...overrides,
  }
}

function makeRole(id: string): Role {
  return { id, eventId: 'e1', title: 'EVS-Operator', assignedPersonId: null, createdAt: '2026-04-07T10:00:00Z' }
}

describe('getRoleBookingStatus', () => {
  it('gibt open zurück wenn keine Bookings vorhanden', () => {
    expect(getRoleBookingStatus([], 'r1')).toBe('open')
  })

  it('gibt open zurück wenn alle Bookings einer anderen Rolle gehören', () => {
    const bookings = [makeBooking({ roleId: 'r2', status: 'sent' })]
    expect(getRoleBookingStatus(bookings, 'r1')).toBe('open')
  })

  it('gibt requested zurück bei status sent', () => {
    const bookings = [makeBooking({ roleId: 'r1', status: 'sent' })]
    expect(getRoleBookingStatus(bookings, 'r1')).toBe('requested')
  })

  it('gibt confirmed zurück bei status confirmed', () => {
    const bookings = [makeBooking({ roleId: 'r1', status: 'confirmed' })]
    expect(getRoleBookingStatus(bookings, 'r1')).toBe('confirmed')
  })

  it('gibt declined zurück wenn neuestes Booking declined ist', () => {
    const bookings = [makeBooking({ id: 'b1', roleId: 'r1', status: 'declined', requestedAt: '2026-04-07T10:00:00Z' })]
    expect(getRoleBookingStatus(bookings, 'r1')).toBe('declined')
  })

  it('gibt requested zurück wenn neues Booking sent ist nach declined', () => {
    const bookings = [
      makeBooking({ id: 'b1', roleId: 'r1', status: 'declined', requestedAt: '2026-04-07T09:00:00Z' }),
      makeBooking({ id: 'b2', roleId: 'r1', status: 'sent',    requestedAt: '2026-04-07T10:00:00Z' }),
    ]
    expect(getRoleBookingStatus(bookings, 'r1')).toBe('requested')
  })
})

describe('checkAllRolesConfirmed', () => {
  it('gibt false zurück wenn eine Rolle open ist', () => {
    const roles = [makeRole('r1'), makeRole('r2')]
    const bookings = [makeBooking({ roleId: 'r1', status: 'confirmed' })]
    expect(checkAllRolesConfirmed(roles, bookings)).toBe(false)
  })

  it('gibt false zurück wenn eine Rolle requested ist', () => {
    const roles = [makeRole('r1'), makeRole('r2')]
    const bookings = [
      makeBooking({ id: 'b1', roleId: 'r1', status: 'confirmed' }),
      makeBooking({ id: 'b2', roleId: 'r2', status: 'sent' }),
    ]
    expect(checkAllRolesConfirmed(roles, bookings)).toBe(false)
  })

  it('gibt true zurück wenn alle Rollen confirmed sind', () => {
    const roles = [makeRole('r1'), makeRole('r2')]
    const bookings = [
      makeBooking({ id: 'b1', roleId: 'r1', status: 'confirmed' }),
      makeBooking({ id: 'b2', roleId: 'r2', status: 'confirmed' }),
    ]
    expect(checkAllRolesConfirmed(roles, bookings)).toBe(true)
  })

  it('gibt false zurück bei leerer Rollen-Liste', () => {
    expect(checkAllRolesConfirmed([], [])).toBe(false)
  })
})
