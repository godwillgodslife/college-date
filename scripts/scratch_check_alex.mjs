import fs from 'fs';

const envContent = fs.readFileSync('c:/college-date/.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[match[1]] = val.trim();
  }
});

const authRes = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'student.tester2026@gmail.com', password: 'CollegeDate2026!VerifiedPass' })
});
const authData = await authRes.json();
const pRes = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/profiles?select=id,full_name,avatar_url&limit=10`, {
  headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${authData.access_token}` }
});
console.log('Profiles in DB:', await pRes.json());
