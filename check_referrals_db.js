import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkReferrals() {
    console.log("Checking last 5 referrals...");
    const { data: refs, error: e1 } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log("Error:", e1);
    console.log("Referrals:", refs);

    console.log("\nChecking last 5 users to see if referred_by is set...");
    const { data: users, error: e2 } = await supabase
        .from('profiles')
        .select('id, full_name, email, referred_by, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log("Error:", e2);
    console.log("Users:", users);
}

checkReferrals();
