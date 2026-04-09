import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/ui/top-bar'
import Link from 'next/link'

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: person } = await supabase
    .from('persons')
    .select('name, role')
    .eq('user_id', user.id)
    .single()

  if (person?.role !== 'owner') redirect('/home')

  const nav = (
    <nav className="flex items-center gap-4">
      <Link
        href="/dashboard"
        className="label-control text-muted-foreground hover:text-foreground transition-colors"
      >
        Dashboard
      </Link>
      <Link
        href="/templates"
        className="label-control text-muted-foreground hover:text-foreground transition-colors"
      >
        Templates
      </Link>
    </nav>
  )

  return (
    <div className="min-h-screen">
      <TopBar userName={person?.name} right={nav} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
