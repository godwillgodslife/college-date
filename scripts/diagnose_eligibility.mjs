const listRes = await fetch('http://127.0.0.1:9222/json/list');
const targets = await listRes.json();
const page = targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);

function send(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (event) => {
            const data = JSON.parse(event.data);
            if (data.id === id) {
                ws.removeEventListener('message', handler);
                if (data.error) reject(data.error);
                else resolve(data.result);
            }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

ws.addEventListener('open', async () => {
    try {
        const res = await send('Runtime.evaluate', {
            expression: `(async () => {
                const userRes = await window.__supabase?.auth?.getUser();
                const user = userRes?.data?.user;
                const uid = user?.id;

                // Let's import the requestsDiscovery module or test its logic
                const hasDiscovered = localStorage.getItem('tcd_requests_discovery_seen_' + uid) === 'true';
                const sessionShown = sessionStorage.getItem('tcd_requests_discovery_session_' + uid) === 'true';

                // Check profiles table for created_at
                const { data: profile } = await window.__supabase.from('profiles').select('*').eq('id', uid).maybeSingle();

                return {
                    user: user?.email,
                    uid,
                    hasDiscovered,
                    sessionShown,
                    profileCreatedAt: profile?.created_at,
                    accountAgeDays: profile?.created_at ? (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24) : null,
                    convsCount: document.querySelectorAll('.conversation-item').length
                };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('ELIGIBILITY EVAL:', JSON.stringify(res.result?.value, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        ws.close();
        process.exit(0);
    }
});
