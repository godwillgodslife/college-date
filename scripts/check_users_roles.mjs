import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
let url = '', anon = '';
for (const l of env.split('\n')) {
    if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
    if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) anon = l.split('=')[1].trim();
}
const supabase = createClient(url, anon);

const r1 = await supabase.auth.signInWithPassword({
    email: 'student.tester2026@gmail.com',
    password: 'CollegeDate2026!VerifiedPass'
});
const u1Profile = await supabase.from('profiles').select('id, full_name, gender, role').eq('id', r1.data.user.id).single();
console.log('User 1 (Alex):', u1Profile.data);

const r2 = await supabase.auth.signInWithPassword({
    email: 'student.tester2026.partner@gmail.com',
    password: 'CollegeDate2026!VerifiedPass'
});
const u2Profile = await supabase.from('profiles').select('id, full_name, gender, role').eq('id', r2.data.user.id).single();
console.log('User 2 (Partner):', u2Profile.data);
