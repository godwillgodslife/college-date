import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Naive env parser for the diagnostic script
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(url, key);

const tablesToCheck = [
    'profiles',
    'messages',
    'swipes',
    'matches',
    'conversations',
    'wallets',
    'referral_codes',
    'referrals',
    'leaderboard_participants',
    'snapshot_views',
    'status_views'
];

async function run() {
    console.log('--- STARTING DIAGNOSTIC SCAN ---');
    let allGood = true;

    for (const table of tablesToCheck) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.error(`❌ Error reading '${table}':`, error.message);
                allGood = false;
            } else {
                console.log(`✅ Table '${table}' is accessible. Row count: ${data.length}`);
            }
        } catch (err) {
            console.error(`❌ Exception reading '${table}':`, err.message);
            allGood = false;
        }
    }

    console.log('--- DIAGNOSTIC SCAN COMPLETE ---');
    if (allGood) {
        console.log('All major tables are intact and correctly respond to the anon client.');
    } else {
        console.error('There were errors. Please review the output above.');
        process.exit(1);
    }
}

run();
