
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

async function checkCompanyInfo() {
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', USER_ID)
        .single()

    if (error) {
        console.error('Error fetching company:', error)
    } else {
        console.log('Company Info Found:')
        console.log('Name:', data.name)
        console.log('Establishment Date:', data.establishment_date)
        console.log('Created At:', data.created_at)
    }
}

checkCompanyInfo()
