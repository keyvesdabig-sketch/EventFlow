import { describe, it, expect } from 'vitest'
import { validatePersonInput } from '@/lib/people'

describe('validatePersonInput', () => {
  it('gibt null zurück wenn Name und E-Mail vorhanden', () => {
    expect(validatePersonInput({ name: 'Max Muster', email: 'max@example.com' })).toBeNull()
  })

  it('gibt Fehler zurück wenn Name leer', () => {
    const result = validatePersonInput({ name: '', email: 'max@example.com' })
    expect(result).not.toBeNull()
    expect(result?.error).toContain('Name')
  })

  it('gibt Fehler zurück wenn Name nur Leerzeichen', () => {
    const result = validatePersonInput({ name: '   ', email: 'max@example.com' })
    expect(result).not.toBeNull()
  })

  it('gibt Fehler zurück wenn E-Mail leer', () => {
    const result = validatePersonInput({ name: 'Max', email: '' })
    expect(result).not.toBeNull()
    expect(result?.error).toContain('E-Mail')
  })

  it('gibt Fehler zurück bei ungültigem E-Mail-Format', () => {
    const result = validatePersonInput({ name: 'Max', email: 'kein-at-zeichen' })
    expect(result).not.toBeNull()
  })

  it('akzeptiert .ch Domain', () => {
    expect(validatePersonInput({ name: 'Max', email: 'max@example.ch' })).toBeNull()
  })
})
