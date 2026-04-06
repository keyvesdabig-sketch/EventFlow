import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/ui/top-bar'

export default async function FreelancerLayout({
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

  if (person?.role !== 'freelancer') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <TopBar userName={person?.name} />
      <main className="px-4 py-6 pb-24">
        {children}
      </main>
    </div>
  )
}
