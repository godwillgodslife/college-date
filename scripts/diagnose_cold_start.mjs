import http from 'http';

function getTargets() {
    return new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function main() {
    const targets = await getTargets();
    const page = targets.find(t => t.type === 'page') || targets[0];
    if (!page?.webSocketDebuggerUrl) {
        console.error('No page target found');
        process.exit(1);
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
    });

    let msgId = 2000;
    function call(method, params = {}) {
        return new Promise((resolve) => {
            const id = ++msgId;
            const onMsg = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.id === id) {
                    ws.removeEventListener('message', onMsg);
                    resolve(msg.result);
                }
            };
            ws.addEventListener('message', onMsg);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async function evalCode(expression) {
        const res = await call('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        return res?.result?.value;
    }

    console.log('=== Current Location ===');
    console.log(await evalCode('window.location.href'));

    console.log('=== LocalStorage Keys & Values ===');
    const ls = await evalCode(`
        (function() {
            const out = {};
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                const v = localStorage.getItem(k);
                out[k] = v && v.length > 50 ? v.slice(0, 50) + '...' : v;
            }
            return out;
        })()
    `);
    console.log(JSON.stringify(ls, null, 2));

    console.log('=== Session from Supabase Client in Window ===');
    const sess = await evalCode(`
        (async function() {
            try {
                if (!window.__supabase) return 'No window.__supabase found';
                const s = await window.__supabase.auth.getSession();
                return {
                    hasSession: Boolean(s?.data?.session),
                    user: s?.data?.session?.user?.id || null,
                    error: s?.error?.message || null
                };
            } catch (err) {
                return { error: err.message };
            }
        })()
    `);
    console.log(sess);

    console.log('=== Cap Secure Storage Keys ===');
    const sec = await evalCode(`
        (async function() {
            try {
                const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');
                const keys = await SecureStorage.keys();
                const authVal = await SecureStorage.getItem('tcd_sb_auth_token');
                return {
                    keys,
                    authValSnippet: authVal ? authVal.slice(0, 40) + '...' : null
                };
            } catch (err) {
                return { error: err.message };
            }
        })()
    `);
    console.log(sec);

    ws.close();
}

main().catch(console.error);
