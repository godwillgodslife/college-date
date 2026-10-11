import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function main() {
    // 1. Search for Queen
    const { data: queens, error: e1 } = await supabase
        .from('profiles')
        .select('id, full_name, username, university, avatar_url, photos, profile_photos, is_banned, is_shadow_banned')
        .ilike('full_name', '%queen%');
    console.log('Queen matches in DB:', queens);

    // 2. Search for Khalil
    const { data: khalils, error: e2 } = await supabase
        .from('profiles')
        .select('id, full_name, username, university, avatar_url, photos, profile_photos, is_banned, is_shadow_banned')
        .ilike('full_name', '%khalil%');
    console.log('Khalil matches in DB:', khalils);

    // 3. Search for Prince or David
    const { data: others, error: e3 } = await supabase
        .from('profiles')
        .select('id, full_name, username, university, avatar_url, photos, profile_photos, is_banned, is_shadow_banned')
        .or('full_name.ilike.%prince%,full_name.ilike.%david%');
    console.log('Other matches in DB:', others);
}

main().catch(console.error);
