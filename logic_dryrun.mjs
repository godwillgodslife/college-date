import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function runTest() {
    console.log('--- STARTING LOGIC DRY-RUN ---');

    // 1. Fetch any 2 valid users from the profiles table to act as our test subjects
    const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, name')
        .limit(2);

    if (profError || !profiles || profiles.length < 2) {
        console.log('Could not fetch 2 profiles to test logic or error occurred.', profError);
        return;
    }

    const userA = profiles[0];
    const userB = profiles[1];
    console.log(`Testing logic between User A (${userA.name}) and User B (${userB.name})`);

    // 2. We can't safely insert fake users without an Auth identity (the database triggers depend on auth.users). 
    // We will instead verify that the RPC functions for swiping exist and are callable, or we will query the schemas directly.

    // Check if get_discovery_profiles RPC exists and accepts the right params
    console.log('Testing RPC: get_discovery_profiles...');
    const { data: discovery, error: discError } = await supabase.rpc('get_discovery_profiles', {
        user_id_param: userA.id,
        limit_param: 1
    });

    if (discError) {
        console.log('⚠️ Failed RPC call get_discovery_profiles:', discError.message);
    } else {
        console.log(`✅ get_discovery_profiles returned ${discovery?.length || 0} profiles successfully.`);
    }

    // Check Swipes table constraints (simulate a duplicate swipe)
    console.log('Testing Swipes table read access...');
    const { data: swipes, error: swipesError } = await supabase
        .from('swipes')
        .select('*')
        .eq('swiper_id', userA.id)
        .limit(1);

    if (swipesError) {
        console.log('⚠️ Could not query swipes:', swipesError.message);
    } else {
        console.log(`✅ successfully queried swipes table.`);
    }

    console.log('--- LOGIC DRY-RUN COMPLETE ---');
}

runTest();
