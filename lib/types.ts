export type Skill =
  | 'camera'
  | 'evs'
  | 'audio'
  | 'vision_mixing'
  | 'rf_tech'
  | 'replay'
  | 'graphics'

export type PersonRole = 'owner' | 'freelancer'

export type EventStatus =
  | 'draft'
  | 'booking'
  | 'confirmed'
  | 'live'
  | 'completed'
  | 'cancelled'

export type BookingStatus = 'sent' | 'confirmed' | 'declined'

export interface Person {
  id: string
  userId: string | null
  name: string
  phone: string
  email: string
  photoUrl: string | null
  skills: Skill[]
  notes: string
  role: PersonRole
  createdAt: string
}

export interface TemplatePhase {
  name: string
  defaultDurationHours: number
}

export interface RoleTemplate {
  title: string
  count: number
  preferredPersonIds: string[]
}

export interface ProductionTemplate {
  id: string
  name: string
  phases: TemplatePhase[]
  roleTemplates: RoleTemplate[]
  defaultVenueInfo: string
  createdAt: string
}

export interface ConcretePhase {
  name: string
  startTime: string // ISO datetime
  endTime: string   // ISO datetime
}

export interface Venue {
  name: string
  address: string
  gpsLat: number
  gpsLng: number
  parkingInfo: string
  accessInfo: string
}

export interface EventDocument {
  name: string
  url: string
}

export interface Event {
  id: string
  templateId: string | null
  title: string
  phases: ConcretePhase[]
  venue: Venue
  status: EventStatus
  documents: EventDocument[]
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Role {
  id: string
  eventId: string
  title: string
  assignedPersonId: string | null
  createdAt: string
}

export interface Booking {
  id: string
  roleId: string
  personId: string
  status: BookingStatus
  requestedAt: string
  respondedAt: string | null
  declineReason: string | null
  createdAt: string
}
