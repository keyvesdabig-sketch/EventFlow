import { describe, it, expectTypeOf } from 'vitest'
import type {
  Person,
  ProductionTemplate,
  Event,
  Role,
  Booking,
  EventStatus,
  BookingStatus,
  Skill,
} from '@/lib/types'

describe('Domain Types', () => {
  it('Person hat die erwarteten Felder', () => {
    expectTypeOf<Person>().toHaveProperty('id')
    expectTypeOf<Person>().toHaveProperty('name')
    expectTypeOf<Person>().toHaveProperty('skills')
    expectTypeOf<Person>().toHaveProperty('role')
  })

  it('Event hat status als EventStatus', () => {
    expectTypeOf<Event['status']>().toEqualTypeOf<EventStatus>()
  })

  it('Booking hat status als BookingStatus', () => {
    expectTypeOf<Booking['status']>().toEqualTypeOf<BookingStatus>()
  })

  it('EventStatus enthält cancelled', () => {
    expectTypeOf<'cancelled'>().toMatchTypeOf<EventStatus>()
  })
})
