
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPrograms() {
    console.log('Inspecting government_programs table...');
    const { data, error } = await supabase
        .from('government_programs')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching programs:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
        console.log('Sample Row:', data[0]);
    } else {
        console.log('Table found but empty.');
    }
}

inspectPrograms();
