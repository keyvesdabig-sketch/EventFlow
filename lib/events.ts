import type { RoleTemplate } from './types'

export interface RoleInsert {
  event_id: string
  title: string
}

export function materializeRoles(
  eventId: string,
  roleTemplates: RoleTemplate[],
): RoleInsert[] {
  return roleTemplates.flatMap(rt =>
    Array.from({ length: rt.count }, () => ({
      event_id: eventId,
      title: rt.title,
    })),
  )
}
