import type { Database } from './types'
import type {
  Person, ProductionTemplate, Event, Role, Booking,
  Skill, EventStatus, BookingStatus,
  TemplatePhase, RoleTemplate, ConcretePhase, Venue, EventDocument,
} from '../types'

type PersonRow = Database['public']['Tables']['persons']['Row']
type TemplateRow = Database['public']['Tables']['production_templates']['Row']
type EventRow = Database['public']['Tables']['events']['Row']
type RoleRow = Database['public']['Tables']['roles']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']

export const personMapper = {
  fromDb(row: PersonRow): Person {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      photoUrl: row.photo_url,
      skills: (row.skills ?? []) as Skill[],
      notes: row.notes ?? '',
      role: row.role as Person['role'],
      createdAt: row.created_at,
    }
  },
}

export const templateMapper = {
  fromDb(row: TemplateRow): ProductionTemplate {
    return {
      id: row.id,
      name: row.name,
      phases: (row.phases as unknown as TemplatePhase[]) ?? [],
      roleTemplates: (row.role_templates as unknown as RoleTemplate[]) ?? [],
      defaultVenueInfo: row.default_venue_info ?? '',
      createdAt: row.created_at,
    }
  },
}

export const eventMapper = {
  fromDb(row: EventRow): Event {
    return {
      id: row.id,
      templateId: row.template_id,
      title: row.title,
      phases: (row.phases as unknown as ConcretePhase[]) ?? [],
      venue: (row.venue as unknown as Venue) ?? {
        name: '', address: '', gpsLat: 0, gpsLng: 0, parkingInfo: '', accessInfo: '',
      },
      status: row.status as EventStatus,
      documents: (row.documents as unknown as EventDocument[]) ?? [],
      notes: row.notes ?? '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  },
}

export const roleMapper = {
  fromDb(row: RoleRow): Role {
    return {
      id: row.id,
      eventId: row.event_id,
      title: row.title,
      assignedPersonId: row.assigned_person_id,
      createdAt: row.created_at,
    }
  },
}

export const bookingMapper = {
  fromDb(row: BookingRow): Booking {
    return {
      id: row.id,
      roleId: row.role_id,
      personId: row.person_id,
      status: row.status as BookingStatus,
      requestedAt: row.requested_at,
      respondedAt: row.responded_at,
      declineReason: row.decline_reason,
      createdAt: row.created_at,
    }
  },
}
