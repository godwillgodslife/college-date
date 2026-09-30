import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const ANON_KEY = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function main() {
    console.log('Authenticating tester account on emulator via port 9222...');
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'student.tester2026@gmail.com',
        password: 'CollegeDate2026!VerifiedPass'
    });

    if (error || !data.session) {
        console.error('Sign in failed:', error);
        process.exit(1);
    }
    console.log('Signed in as:', data.user.email, data.user.id);

    // Connect to port 9222 CDP
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const targets = await listRes.json();
    const page = targets.find(t => t.type === 'page') || targets[0];
    if (!page?.webSocketDebuggerUrl) {
        console.error('No debugger url');
        process.exit(1);
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));

    function evalInPage(expr) {
        return new Promise((resolve, reject) => {
            const id = Math.floor(Math.random() * 100000);
            const handler = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.id === id) {
                    ws.removeEventListener('message', handler);
                    resolve(msg.result?.result?.value);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({
                id,
                method: 'Runtime.evaluate',
                params: {
                    expression: expr,
                    returnByValue: true,
                    awaitPromise: true
                }
            }));
        });
    }

    const sessionStr = JSON.stringify(data.session);
    await evalInPage(`(() => {
        localStorage.setItem("sb-gedoyoleoscgxgdqszzc-auth-token", ${JSON.stringify(sessionStr)});
        window.location.href = '/chat';
    })()`);

    console.log('Injected session into localStorage and redirected to /chat!');
    await new Promise(r => setTimeout(r, 4000));
    const currentUrl = await evalInPage(`window.location.href`);
    console.log('Current URL after redirect:', currentUrl);

    ws.close();
    process.exit(0);
}

main().catch(console.error);
