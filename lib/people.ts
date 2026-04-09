export function validatePersonInput(data: { name: string; email: string }): { error: string } | null {
  if (!data.name.trim()) return { error: 'Name darf nicht leer sein' }
  if (!data.email.trim()) return { error: 'E-Mail darf nicht leer sein' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    return { error: 'Ungültige E-Mail-Adresse' }
  }
  return null
}
