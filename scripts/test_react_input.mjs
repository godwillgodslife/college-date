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

    const res = await send('Runtime.evaluate', {
        expression: `(async () => {
            const input = document.querySelector('.explore-search-input');
            if (!input) return 'no input';
            
            // Set value properly with React value tracker
            if (input._valueTracker) {
                input._valueTracker.setValue('');
            }
            input.value = 'Queen';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            // Wait 100ms for React state update
            await new Promise(r => setTimeout(r, 100));

            // Click search submit button
            const btn = document.querySelector('.search-submit-btn');
            btn.click();

            // Wait 2.5s for search results
            await new Promise(r => setTimeout(r, 2500));

            const cards = Array.from(document.querySelectorAll('.explore-card')).map(c => ({
                name: c.querySelector('.card-info h3')?.innerText,
                img: c.querySelector('img')?.src
            }));
            const feedback = document.querySelector('.search-results-feedback')?.innerText;
            const empty = document.querySelector('.empty-discovery')?.innerText;

            return {
                inputValue: input.value,
                cardCount: cards.length,
                cards,
                feedback,
                empty
            };
        })()`,
        returnByValue: true,
        awaitPromise: true
    });

    console.log('Result for Queen:', JSON.stringify(res.result?.value, null, 2));
    ws.close();
}

main().catch(console.error);
