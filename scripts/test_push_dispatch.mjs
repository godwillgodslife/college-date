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

async function main() {
    console.log('--- 1. Authenticating as Tester ---');
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'student.tester2026@gmail.com',
        password: 'CollegeDate2026!VerifiedPass'
    });
    if (authErr) throw authErr;
    console.log('Authenticated User ID:', auth.user.id);

    console.log('\n--- 2. Invoking send-notification-push Edge Function directly ---');
    const payload = {
        userId: auth.user.id,
        type: 'message',
        category: 'messages',
        title: 'New Message from Amaka 💬',
        content: 'Hey Alex! Are you coming to the library study session today? 📚',
        actorId: '2e28c3bb-9271-4822-ba72-3518e1ef6b22', // Amaka
        data: {
            actor_name: 'Amaka',
            actor_avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            campus: 'UNILAG',
            url: '/chat',
            priority: 'high'
        }
    };

    const res = await supabase.functions.invoke('send-notification-push', {
        body: payload
    });

    console.log('Edge Function Response Status/Error:', res.error);
    console.log('Edge Function Response Body:', res.data);
}

main().catch(console.error);
