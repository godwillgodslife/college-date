import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://swnzdfuoykqoaxgylvcc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // I will just use the anon key or service role key if available, but wait, I can just use psql connection string in a script!
);
