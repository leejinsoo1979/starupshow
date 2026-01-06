
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

async function inspectCompany() {
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error fetching company:', error)
    } else if (data && data.length > 0) {
        console.log('Company Columns:', Object.keys(data[0]))
        console.log('First Company:', data[0])
    } else {
        console.log('No companies found')
    }
}

inspectCompany()
