import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'
import { TallyHeader } from '@/components/ui/tally-header'
import { ProductionChip } from '@/components/ui/production-chip'

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

describe('TallyHeader', () => {
  it('renders a stripe element', () => {
    const { container } = render(<TallyHeader status="live" />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('uses tally-red class for live status', () => {
    const { container } = render(<TallyHeader status="live" />)
    expect(container.firstChild).toHaveClass('bg-tally-red')
  })

  it('uses signal-green class for checked-in status', () => {
    const { container } = render(<TallyHeader status="checked-in" />)
    expect(container.firstChild).toHaveClass('bg-signal-green')
  })
})

describe('ProductionChip', () => {
  it('renders the label text', () => {
    render(<ProductionChip label="EVS" />)
    expect(screen.getByText('EVS')).toBeInTheDocument()
  })

  it('applies tally-red text class for live variant', () => {
    render(<ProductionChip label="LIVE" variant="live" />)
    expect(screen.getByText('LIVE')).toHaveClass('text-tally-red')
  })

  it('applies signal-green text class for confirmed variant', () => {
    render(<ProductionChip label="OK" variant="confirmed" />)
    expect(screen.getByText('OK')).toHaveClass('text-signal-green')
  })

  it('applies pending-amber text class for pending variant', () => {
    render(<ProductionChip label="PENDING" variant="pending" />)
    expect(screen.getByText('PENDING')).toHaveClass('text-pending-amber')
  })
})
