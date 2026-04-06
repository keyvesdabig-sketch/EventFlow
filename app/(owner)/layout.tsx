import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/ui/top-bar'

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

  return (
    <div className="min-h-screen bg-background">
      <TopBar userName={person?.name} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
