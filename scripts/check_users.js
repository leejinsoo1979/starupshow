const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
  // Check users table
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, name, role')
    .limit(10);

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('=== Users in Database ===');
    users.forEach(u => {
      console.log(`- ${u.email} (${u.name}) [${u.role}]`);
    });
  }

  // Check auth users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.log('Auth Error:', authError.message);
  } else {
    console.log('\n=== Auth Users ===');
    authData.users.slice(0, 10).forEach(u => {
      console.log(`- ${u.email} (ID: ${u.id})`);
    });
  }
}

checkUsers();
