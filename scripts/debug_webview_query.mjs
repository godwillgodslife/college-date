import WebSocket from 'ws';
import { execSync } from 'child_process';

async function main() {
    const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const target = JSON.parse(raw).find(t => t.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });
    await new Promise(r => ws.on('open', r));

    let id = 1;
    function send(method, params = {}) {
        return new Promise((resolve) => {
            const cmdId = id++;
            ws.on('message', function handler(data) {
                const msg = JSON.parse(data.toString());
                if (msg.id === cmdId) { ws.off('message', handler); resolve(msg.result); }
            });
            ws.send(JSON.stringify({ id: cmdId, method, params }));
        });
    }

    // Execute direct Supabase fetch inside webview using the stored auth token
    const testRes = await send('Runtime.evaluate', {
        expression: `(async () => {
            try {
                const tokenData = JSON.parse(localStorage.getItem('sb-gedoyoleoscgxgdqszzc-auth-token'));
                const token = tokenData?.access_token;
                const res = await fetch('https://gedoyoleoscgxgdqszzc.supabase.co/rest/v1/profiles?select=*&is_shadow_banned=eq.false&is_banned=eq.false&or=(full_name.ilike.%25Queen%25,username.ilike.%25Queen%25,university.ilike.%25Queen%25,faculty.ilike.%25Queen%25,department.ilike.%25Queen%25)&limit=50', {
                    headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys',
                        'Authorization': 'Bearer ' + token
                    }
                });
                const json = await res.json();
                return { status: res.status, count: Array.isArray(json) ? json.length : 0, data: json };
            } catch(e) {
                return { error: e.message, stack: e.stack };
            }
        })()`,
        returnByValue: true,
        awaitPromise: true
    });

    console.log('Direct PostgREST fetch result in webview:', JSON.stringify(testRes.result?.value, null, 2));
    ws.close();
}

main().catch(console.error);
