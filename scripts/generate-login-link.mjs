import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lvdezpdhjnbppphboxyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2ZGV6cGRoam5icHBwaGJveHlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQwNzEzMiwiZXhwIjoyMDkwOTgzMTMyfQ.51vGKY5jz0MaU2g5TekoMQhU3QzLTrIWEgOURIp4bW4',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const { data, error } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: 'keyvesdabig@gmail.com',
  options: { redirectTo: 'http://localhost:3000/auth/callback' },
})

if (error) {
  console.error('Fehler:', error.message)
} else {
  console.log('\nLogin-Link (direkt im Browser öffnen):\n')
  console.log(data.properties.action_link)
  console.log()
}
