import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';
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
