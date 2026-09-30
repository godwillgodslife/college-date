import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // We don't have a user token, but we can try inserting to see the schema error or RLS error
    // Wait, if it's RLS we'll just get "new row violates row-level security policy".
    // But maybe the schema has an extra required column.

    // Let's at least fetch a single row to see its shape
    const { data, error } = await supabase.from('confessions').select('*').limit(1);
    console.log('Confession shape:', data?.[0]);
    console.log('Error:', error);
}

run();
