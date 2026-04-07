import type { Database, Json } from './types'
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
  toDb(person: Person): Partial<Database['public']['Tables']['persons']['Insert']> {
    return {
      id: person.id,
      user_id: person.userId,
      name: person.name,
      phone: person.phone,
      email: person.email,
      photo_url: person.photoUrl,
      skills: person.skills,
      notes: person.notes,
      role: person.role,
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
  toDb(template: ProductionTemplate): Database['public']['Tables']['production_templates']['Insert'] {
    return {
      id: template.id,
      name: template.name,
      phases: template.phases as unknown as Json,
      role_templates: template.roleTemplates as unknown as Json,
      default_venue_info: template.defaultVenueInfo,
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
  toDb(event: Event): Database['public']['Tables']['events']['Insert'] {
    return {
      id: event.id,
      template_id: event.templateId,
      title: event.title,
      phases: event.phases as unknown as Json,
      venue: event.venue as unknown as Json,
      status: event.status,
      documents: event.documents as unknown as Json,
      notes: event.notes,
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
  toDb(role: Role): Database['public']['Tables']['roles']['Insert'] {
    return {
      id: role.id,
      event_id: role.eventId,
      title: role.title,
      assigned_person_id: role.assignedPersonId,
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
  toDb(booking: Booking): Database['public']['Tables']['bookings']['Insert'] {
    return {
      id: booking.id,
      role_id: booking.roleId,
      person_id: booking.personId,
      status: booking.status,
      requested_at: booking.requestedAt,
      responded_at: booking.respondedAt,
      decline_reason: booking.declineReason,
    }
  },
}
