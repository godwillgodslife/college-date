'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DebugPage() {
    const [status, setStatus] = useState('Loading...');
    const [userData, setUserData] = useState(null);
    const [profileData, setProfileData] = useState(null);
    const [sessionData, setSessionData] = useState(null);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        const supabase = createClient();

        // 1. Check Session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        setSessionData({ session, error: sessionError });

        if (!session) {
            setStatus('No active session.');
            return;
        }

        // 2. Check User
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        setUserData({ user, error: userError });

        if (user) {
            // 3. Check Profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            setProfileData({ profile, error: profileError });
            setStatus('Checks complete.');
        }
    };

    const [logs, setLogs] = useState([]);

    const addLog = (msg, data = null) => {
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp}: ${msg} ${data ? JSON.stringify(data) : ''}`;
        setLogs(prev => [...prev, logEntry]);
        console.log(msg, data);
    };

    const forceCreateProfile = async () => {
        addLog('Starting Force Create Profile...');
        const supabase = createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            addLog('Error getting user:', userError);
            return;
        }
        addLog('User found:', user.id);

        const profileData = {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata.full_name || 'Debug User',
            gender: 'male', // Default for debug
            age: 25,        // Default for debug
            university: 'University of debug', // Default for debug
        };

        addLog('Attempting INSERT with:', profileData);

        // Try INSERT
        const { data: insertData, error: insertError } = await supabase
            .from('profiles')
            .insert(profileData)
            .select();

        if (insertError) {
            addLog('INSERT failed:', insertError);
            // If duplicate, try UPDATE
            if (insertError.code === '23505') { // Unique violation
                addLog('Profile exists, trying UPDATE...');
                const { data: updateData, error: updateError } = await supabase
                    .from('profiles')
                    .update(profileData)
                    .eq('id', user.id)
                    .select();

                if (updateError) {
                    addLog('UPDATE failed:', updateError);
                } else {
                    addLog('UPDATE successful:', updateData);
                }
            }
        } else {
            addLog('INSERT successful:', insertData);
        }
    };

    return (
        <div style={{ padding: 40, fontFamily: 'monospace', overflow: 'auto', paddingBottom: 100 }}>
            <h1>Debug Info</h1>
            <p>Status: {status}</p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button onClick={() => location.reload()} style={{ padding: '10px' }}>Refresh State</button>
                <button onClick={forceCreateProfile} style={{ padding: '10px', background: '#007bff', color: 'white' }}>Force Create Profile</button>
            </div>

            <div style={{ background: '#000', color: '#0f0', padding: 20, borderRadius: 8, marginBottom: 20, minHeight: 150 }}>
                <h3>Logs</h3>
                {logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
                <div style={{ background: '#f0f0f0', padding: 20, borderRadius: 8 }}>
                    <h3>Session</h3>
                    <pre>{JSON.stringify(sessionData, null, 2)}</pre>
                </div>

                <div style={{ background: '#e0e0e0', padding: 20, borderRadius: 8 }}>
                    <h3>User</h3>
                    <pre>{JSON.stringify(userData, null, 2)}</pre>
                </div>

                <div style={{ background: '#d0d0d0', padding: 20, borderRadius: 8 }}>
                    <h3>Profile (Database Row)</h3>
                    <pre>{JSON.stringify(profileData, null, 2)}</pre>
                </div>
            </div>
        </div>
    );
}
