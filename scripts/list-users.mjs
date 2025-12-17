import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zcykttygjglzyyxotzct.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeWt0dHlnamdsenl5eG90emN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMzODkxNSwiZXhwIjoyMDgwOTE0OTE1fQ.SovGgYnnamWGIza0fiG0uYCzW8p4c5bG3qAeBRAz0UU'

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// List all users in public.users
const { data: publicUsers } = await adminClient
  .from('users')
  .select('*')

console.log('=== public.users ===')
if (publicUsers) {
  publicUsers.forEach(u => {
    console.log('ID:', u.id)
    console.log('Email:', u.email)
    console.log('Name:', u.name)
    console.log('---')
  })
}

// List auth users
const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()
console.log('\n=== auth.users ===')
if (authError) {
  console.log('Error:', authError.message)
}
if (authUsers && authUsers.users) {
  console.log('Total auth users:', authUsers.users.length)
  authUsers.users.forEach(u => {
    const provider = u.app_metadata ? u.app_metadata.provider : 'email'
    const name = u.user_metadata ? (u.user_metadata.name || u.user_metadata.full_name) : 'N/A'
    console.log('ID:', u.id)
    console.log('Email:', u.email)
    console.log('Provider:', provider)
    console.log('Google Name:', name)
    console.log('---')
  })
} else {
  console.log('No auth users found or error occurred')
}
