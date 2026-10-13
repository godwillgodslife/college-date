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
    console.log('--- Authenticating as Tester (Alex) ---');
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'student.tester2026@gmail.com',
        password: 'CollegeDate2026!VerifiedPass'
    });
    if (authErr) throw authErr;

    console.log('--- Dispatching Real Push with Amaka Distinct Photo ---');
    // Using a distinct authentic portrait of a Black female student for Amaka (different from Alex's photo)
    const amakaPhoto = 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=300&q=80';

    const payload = {
        userId: auth.user.id,
        type: 'message',
        category: 'messages',
        title: 'New Message from Amaka 💬',
        content: 'Hey Alex! Are you coming to the library study session today? 📚',
        actorId: '2e28c3bb-9271-4822-ba72-3518e1ef6b22', // Amaka
        data: {
            actor_name: 'Amaka',
            actor_avatar_url: amakaPhoto,
            campus: 'UNILAG',
            url: '/chat',
            priority: 'high'
        }
    };

    const res = await supabase.functions.invoke('send-notification-push', {
        body: payload
    });

    console.log('Push response:', res.data);
}

main().catch(console.error);
