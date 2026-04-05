import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: person } = await supabase
    .from('persons')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (person?.role === 'owner') {
    redirect('/dashboard')
  }

  redirect('/home')
}
