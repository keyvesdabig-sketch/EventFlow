import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      configurable: true,
      writable: true,
    })
  })

  it('renders children', () => {
    render(<Button>Magic Link senden</Button>)
    expect(screen.getByRole('button', { name: 'Magic Link senden' })).toBeInTheDocument()
  })

  it('calls navigator.vibrate(10) on click', () => {
    render(<Button>Trigger</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(navigator.vibrate).toHaveBeenCalledWith(10)
  })

  it('does not throw when navigator.vibrate is undefined', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    render(<Button>Trigger</Button>)
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow()
  })

  it('still calls custom onClick alongside haptic', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Trigger</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
    expect(navigator.vibrate).toHaveBeenCalledWith(10)
  })
})
