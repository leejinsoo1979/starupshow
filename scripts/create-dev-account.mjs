import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zcykttygjglzyyxotzct.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeWt0dHlnamdsenl5eG90emN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMzODkxNSwiZXhwIjoyMDgwOTE0OTE1fQ.SovGgYnnamWGIza0fiG0uYCzW8p4c5bG3qAeBRAz0UU'

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// 1. Create auth user (without trigger)
console.log('Creating auth user directly...')

// First, insert into public.users with a placeholder UUID
const userId = crypto.randomUUID()

// Insert public.users first
const { error: publicError } = await adminClient.from('users').insert({
  id: userId,
  email: 'dev@glowus.app',
  name: 'Developer',
  role: 'FOUNDER'
})

if (publicError) {
  console.log('Public users insert result:', publicError.message)
}

// Now try creating auth user
const { data, error } = await adminClient.auth.admin.createUser({
  id: userId,
  email: 'dev@glowus.app',
  password: 'dev123456',
  email_confirm: true,
  user_metadata: { name: 'Developer' }
})

if (error) {
  console.error('Auth create error:', error.message)

  // Clean up public.users if auth failed
  await adminClient.from('users').delete().eq('id', userId)

  console.log('\n💡 Supabase Dashboard에서 직접 만드세요:')
  console.log('Authentication → Users → Add user')
  console.log('Email: dev@glowus.app')
  console.log('Password: dev123456')
  console.log('Auto Confirm User ✅')
} else {
  console.log('✅ Dev account created!')
  console.log('Email: dev@glowus.app')
  console.log('Password: dev123456')
}
