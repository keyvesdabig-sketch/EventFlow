import { cn } from "@/lib/utils"

type TallyStatus = 'live' | 'checked-in'

export function TallyHeader({ status }: { status: TallyStatus }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'h-1 w-full flex-shrink-0',
        status === 'live' ? 'bg-tally-red' : 'bg-signal-green'
      )}
    />
  )
}
