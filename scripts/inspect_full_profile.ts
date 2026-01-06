
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

async function inspectFullData() {
    console.log('--- Company Support Profile ---')
    const { data: profile, error: profileError } = await supabase
        .from('company_support_profiles')
        .select('*')
        .eq('user_id', USER_ID)
        .single()

    if (profileError) {
        console.error('Error fetching profile:', profileError)
    } else {
        console.log('ID:', profile.id)
        console.log('Company ID:', profile.company_id)
        console.log('Business Years (Profile):', profile.business_years)
        console.log('Startup Stage:', profile.startup_stage)
        console.log('Entity Type:', profile.entity_type)
        console.log('Is Youth Startup:', profile.is_youth_startup)
        console.log('CEO Birth Date (Profile):', profile.ceo_birth_date)
    }

    console.log('\n--- Companies Table ---')
    // We need to query companies table. Since user_id column might be missing (based on previous error), 
    // we will try to use the company_id found in the profile if available.

    if (profile?.company_id) {
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', profile.company_id)
            .single()

        if (companyError) {
            console.error('Error fetching company:', companyError)
        } else {
            console.log('Name:', company.name)
            console.log('Establishment Date:', company.establishment_date)
        }
    } else {
        console.log('No company_id linked in profile.')
    }
}

inspectFullData()
