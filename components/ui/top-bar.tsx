interface TopBarProps {
  title?: string
  userName?: string
  right?: React.ReactNode
}

export function TopBar({ title = 'EventFlow', userName, right }: TopBarProps) {
  return (
    <header className="sticky top-0 z-50 h-14 flex items-center px-4 backdrop-blur-[24px] bg-level-0/80 border-b border-border">
      <div className="flex items-center justify-between w-full max-w-6xl mx-auto">
        <span
          className="font-semibold text-foreground tracking-tight"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          {title}
        </span>
        <div className="flex items-center gap-3">
          {right}
          {userName && (
            <span className="label-control text-muted-foreground">{userName}</span>
          )}
        </div>
      </div>
    </header>
  )
}
