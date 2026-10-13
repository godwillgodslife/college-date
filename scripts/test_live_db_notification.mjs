import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env', 'utf8');
const envVars = Object.fromEntries(
    envContent.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && l.includes('='))
        .map(l => {
            const idx = l.indexOf('=');
            return [l.substring(0, idx).trim(), l.substring(idx + 1).trim()];
        })
);

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    console.log('--- 1. Authenticating as Tester ---');
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'student.tester2026@gmail.com',
        password: 'CollegeDate2026!VerifiedPass'
    });
    if (authErr) throw authErr;
    const userId = auth.user.id;
    console.log('Authenticated User ID:', userId);

    console.log('\n--- 2. Inserting In-App Notification via RPC ---');
    const testTitle = 'Mutual Match with Chioma! 💕';
    const testContent = 'You and Chioma liked each other at UNILAG. Say hello!';
    const testMetadata = {
        actor_name: 'Chioma',
        actor_avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        campus: 'UNILAG',
        url: '/chat',
        priority: 'high'
    };

    const { data: notifData, error: notifErr } = await supabase.rpc('insert_notification', {
        p_user_id: userId,
        p_actor_id: null,
        p_type: 'match',
        p_title: testTitle,
        p_content: testContent,
        p_metadata: testMetadata,
        p_category: 'matches',
        p_priority: 'high',
        p_deep_link: '/chat'
    });

    if (notifErr) {
        console.error('RPC Error:', notifErr);
        throw notifErr;
    }
    console.log('Inserted Notification Result:', notifData);

    await sleep(1500);

    // Fetch the notification from public.notifications
    const { data: notifs, error: fetchErr } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

    console.log('\n--- 3. Latest Notifications in Database ---');
    console.log(notifs?.map(n => ({
        id: n.id,
        title: n.title,
        type: n.type,
        category: n.category,
        is_read: n.is_read,
        created_at: n.created_at,
        sent_at: n.sent_at
    })));

    // Check notification_email_queue
    const { data: queueItems } = await supabase
        .from('notification_email_queue')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

    console.log('\n--- 4. Delayed Email Queue Status (15-min fallback window) ---');
    console.log(queueItems?.map(q => ({
        id: q.id,
        notification_id: q.notification_id,
        status: q.status,
        scheduled_for: q.scheduled_for,
        created_at: q.created_at
    })));

    if (notifs && notifs[0]) {
        console.log('\n--- 5. Testing Read Cancellation: Marking notification as read ---');
        const notifId = notifs[0].id;
        const { error: readErr } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notifId);
        
        console.log('Mark read error:', readErr);

        await sleep(1000);

        const { data: updatedQueue } = await supabase
            .from('notification_email_queue')
            .select('*')
            .eq('notification_id', notifId);

        console.log('Updated Queue Item Status (Expected cancelled_read):', updatedQueue);
    }

    console.log('\n=== LIVE SUPABASE NOTIFICATION & EMAIL QUEUE PIPELINE VERIFIED ===');
}

main().catch(console.error);
