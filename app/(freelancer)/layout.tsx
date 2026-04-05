import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
    <div className="min-h-screen bg-white max-w-lg mx-auto">
      <main className="px-4 py-6">
        {children}
      </main>
    </div>
  )
}
