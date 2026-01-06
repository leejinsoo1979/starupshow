
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials missing')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const USER_ID = '014524d9-d3ed-46ab-b0b5-80beb5f4b7b8'

async function checkProfile() {
    const { data, error } = await supabase
        .from('company_support_profiles')
        .select('ceo_birth_date, company_name')
        .eq('user_id', USER_ID)
        .single()

    if (error) {
        console.error('Error fetching profile:', error)
    } else {
        console.log('Profile Found:')
        console.log('Company:', data.company_name)
        console.log('CEO Birth Date:', data.ceo_birth_date)
    }
}

checkProfile()
