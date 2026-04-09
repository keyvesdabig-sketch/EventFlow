import Image from 'next/image'
import { User } from 'lucide-react'

interface TopBarProps {
  title?: string
  userName?: string
  right?: React.ReactNode
}

export function TopBar({ title = 'EventFlow', userName, right }: TopBarProps) {
  return (
    <header className="sticky top-0 z-50 h-16 flex items-center px-6 backdrop-blur-3xl bg-white/5 border-b border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between w-full max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Image src="/Logo.png" alt="Logo" width={24} height={24} className="object-contain" />
          <span
            className="font-semibold text-foreground tracking-tight"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            {title}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {right}
          
          {right && userName && (
             <div className="w-px h-3.5 bg-white/15" />
          )}
          
          {userName && (
            <div className="flex items-center gap-2 px-2 cursor-default opacity-80">
              <User className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className="label-control text-muted-foreground/60">{userName}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
