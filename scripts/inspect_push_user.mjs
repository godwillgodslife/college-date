import { execFileSync, execSync } from 'child_process';
import path from 'path';
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

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_ANON = envVars.VITE_SUPABASE_ANON_KEY;
const ADB_PATH = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    execFileSync(ADB_PATH, ['start-server']);
    execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'wait-for-device']);
    
    let socketName = null;
    for (let i = 0; i < 10; i++) {
        const unixOut = execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'shell', 'cat', '/proc/net/unix'], { encoding: 'utf8' });
        const match = unixOut.match(/@(webview_devtools_remote_\d+)/);
        if (match) {
            socketName = match[1];
            break;
        }
        await sleep(1000);
    }
    if (!socketName) throw new Error('No webview socket found after waiting');

    try { execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'forward', '--remove', 'tcp:9222'], { stdio: 'ignore' }); } catch (_) {}
    execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'forward', 'tcp:9222', `localabstract:${socketName}`]);

    const jsonStr = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 4 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const pages = JSON.parse(jsonStr);
    const page = pages.find(p => p.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    await new Promise((res, rej) => {
        ws.onopen = res;
        ws.onerror = rej;
    });

    let id = 1;
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const myId = id++;
            const t = setTimeout(() => reject(new Error('Timeout ' + method)), 10000);
            const handler = (evt) => {
                const data = JSON.parse(evt.data);
                if (data.id === myId) {
                    clearTimeout(t);
                    ws.removeEventListener('message', handler);
                    resolve(data.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id: myId, method, params }));
        });
    }

    await send('Runtime.enable');

    const appState = await send('Runtime.evaluate', {
        expression: `(() => {
            const sessionStr = localStorage.getItem('supabase.auth.token') || localStorage.getItem('sb-' + location.hostname.split('.')[0] + '-auth-token') || Object.keys(localStorage).filter(k => k.includes('auth-token')).map(k => localStorage.getItem(k))[0];
            let user = null;
            try {
                const parsed = JSON.parse(sessionStr);
                user = parsed?.currentSession?.user || parsed?.user || null;
            } catch(e) {}
            return {
                user: user ? { id: user.id, email: user.email } : null,
                pushDebugState: window.__TCD_PUSH_DEBUG_STATE__ || null,
                capacitorPlatform: window.Capacitor ? window.Capacitor.getPlatform() : 'none',
                isNative: window.Capacitor ? window.Capacitor.isNativePlatform() : false
            };
        })()`,
        returnByValue: true
    });
    console.log('[Emulator Live App State]:', JSON.stringify(appState?.result?.value, null, 2));

    ws.close();

    // Now query Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, onesignal_id, push_notifications, message_notifications')
        .eq('email', 'student.tester2026@gmail.com')
    console.log('[Supabase Tester Profile]:', profile);

    if (profile?.id) {
        const { data: devices } = await supabase
            .from('user_notification_devices')
            .select('*')
            .eq('user_id', profile.id);
        console.log('[Supabase User Devices]:', devices);
    }
}

main().catch(console.error);
