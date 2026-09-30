import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
let url = '', anon = '';
for (const l of env.split('\n')) {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) anon = l.split('=')[1].trim();
}
const supabase = createClient(url, anon);

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'pure.signup.1788523079386@thecollegedate.com',
  password: 'Password123!Test'
});

if (error) {
  console.error('Login error:', error);
} else {
  console.log('Existing account login SUCCESS: User ID =', data.user.id, 'Email =', data.user.email);
}
