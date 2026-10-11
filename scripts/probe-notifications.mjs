import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Parse .env
const envFile = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
const env = {};
for (const line of envFile.split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
}

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runProbe() {
  console.log('=== PROBING SUPABASE NOTIFICATION ARCHITECTURE ===');
  console.log('Target URL:', supabaseUrl);

  // 1. Probe send-notification-push Edge Function
  console.log('\n--- 1. Probing send-notification-push Edge Function with emulator subscription ---');
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-notification-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        subscriptionIds: ['d6179362-545c-410a-9835-c600aeca8c9d'],
        title: 'Forensic Audit Test',
        content: 'This is a controlled push test for the notification audit.'
      })
    });
    const status = res.status;
    const body = await res.text();
    console.log(`send-notification-push HTTP ${status}:`, body);
  } catch (err) {
    console.error('send-notification-push fetch error:', err.message);
  }

  // 2. Probe send-notification-email Edge Function
  console.log('\n--- 2. Probing send-notification-email Edge Function ---');
  try {
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-notification-email', {
      body: {
        userId: '00000000-0000-0000-0000-000000000000',
        title: 'Diagnostic Probe',
        subject: 'Diagnostic Probe',
        body: 'Diagnostic Probe'
      }
    });
    console.log('send-notification-email response:', JSON.stringify(emailData || emailError, null, 2));
  } catch (err) {
    console.error('send-notification-email invoke error:', err.message);
  }

  // 3. Inspect recent notifications in database
  console.log('\n--- 3. Querying notifications table sample (latest 5) ---');
  try {
    const { data: notifs, error: notifsError } = await supabase
      .from('notifications')
      .select('id, type, title, content, created_at, category, priority, user_id')
      .order('created_at', { ascending: false })
      .limit(5);

    if (notifsError) {
      console.log('notifications query error (likely RLS on anon):', notifsError.message);
    } else {
      console.log('Latest notifications count:', notifs?.length);
      console.log('Sample:', JSON.stringify(notifs, null, 2));
    }
  } catch (err) {
    console.error('notifs error:', err.message);
  }

  // 4. Inspect user_notification_devices table
  console.log('\n--- 4. Querying user_notification_devices count ---');
  try {
    const { data: devices, error: devicesError } = await supabase
      .from('user_notification_devices')
      .select('platform, permission_status, created_at')
      .limit(5);

    if (devicesError) {
      console.log('user_notification_devices query error (likely RLS on anon):', devicesError.message);
    } else {
      console.log('Devices sample:', JSON.stringify(devices, null, 2));
    }
  } catch (err) {
    console.error('devices error:', err.message);
  }

  console.log('\n=== PROBE COMPLETE ===');
}

runProbe().catch(console.error);
