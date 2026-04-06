import { cn } from "@/lib/utils"

type ChipVariant = 'default' | 'live' | 'confirmed' | 'pending'

interface ProductionChipProps {
  label: string
  variant?: ChipVariant
}

export function ProductionChip({ label, variant = 'default' }: ProductionChipProps) {
  return (
    <span
      className={cn(
        'label-control inline-flex items-center px-2 py-0.5 rounded-sm bg-level-3 text-foreground ghost-border',
        variant === 'live' && 'text-tally-red',
        variant === 'confirmed' && 'text-signal-green',
        variant === 'pending' && 'text-pending-amber',
      )}
    >
      {label}
    </span>
  )
}
