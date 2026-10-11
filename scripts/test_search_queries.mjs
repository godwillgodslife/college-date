import WebSocket from 'ws';
import { execSync } from 'child_process';

async function main() {
    const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const targets = JSON.parse(raw);
    const target = targets.find(t => t.type === 'page');
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

    // Check auth user inside window
    const authInfo = await send('Runtime.evaluate', {
        expression: `(() => {
            const authKey = Object.keys(localStorage).find(k => k.includes('auth-token'));
            const authVal = authKey ? JSON.parse(localStorage.getItem(authKey)) : null;
            return {
                authKey,
                userId: authVal?.user?.id,
                email: authVal?.user?.email
            };
        })()`,
        returnByValue: true
    });
    console.log('Auth info in webview:', authInfo.result?.value);

    // Run search for "prince" and "queen" and "justice" and "david" directly via supabase in webview
    const queryTest = await send('Runtime.evaluate', {
        expression: `(async () => {
            try {
                // Access supabase client if exposed or import
                const sbKey = Object.keys(window).find(k => window[k]?.from && window[k]?.auth);
                return { hasSb: !!sbKey, keys: Object.keys(window).filter(k => k.includes('supa') || k.includes('Supa')) };
            } catch(e) {
                return { error: e.message };
            }
        })()`,
        returnByValue: true
    });
    console.log('Supabase check:', queryTest.result?.value);

    // Let's test searching via input on Explore
    for (const name of ['David', 'Prince', 'Justice', 'Queen']) {
        const res = await send('Runtime.evaluate', {
            expression: `(async () => {
                const input = document.querySelector('.explore-search-input');
                if (!input) return { err: 'no input' };
                const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSet.call(input, '${name}');
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));

                const submitBtn = document.querySelector('.search-submit-btn');
                submitBtn.click();

                await new Promise(r => setTimeout(r, 2000));

                const cards = Array.from(document.querySelectorAll('.explore-card')).map(c => c.querySelector('.card-info h3')?.innerText);
                const feedback = document.querySelector('.search-results-feedback')?.innerText;
                const empty = document.querySelector('.empty-discovery')?.innerText;
                return { name: '${name}', cardCount: cards.length, cards, feedback, empty };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log(`Search "${name}" result:`, res.result?.value);
    }

    ws.close();
}

main().catch(console.error);
