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

    const stateRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const exploreEl = document.querySelector('.explore-page');
            const fiberKey = Object.keys(exploreEl || {}).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
            const input = document.querySelector('.explore-search-input');
            const inputFiberKey = Object.keys(input || {}).find(k => k.startsWith('__reactFiber'));
            
            // Look for memoizedState in fiber
            let fiber = exploreEl ? exploreEl[fiberKey] : null;
            let states = [];
            let curr = fiber;
            while (curr && states.length < 15) {
                if (curr.memoizedState !== undefined) {
                    states.push({ type: curr.type?.name || typeof curr.type, state: curr.memoizedState });
                }
                curr = curr.child;
            }

            return {
                inputValue: input?.value,
                inputValProp: input?.getAttribute('value'),
                hasClearBtn: !!document.querySelector('.search-clear-btn'),
                feedbackText: document.querySelector('.search-results-feedback')?.innerText,
                emptyText: document.querySelector('.empty-discovery')?.innerText,
                cardsCount: document.querySelectorAll('.explore-card').length,
                innerHtmlEmpty: document.querySelector('.empty-discovery')?.innerHTML
            };
        })()`,
        returnByValue: true
    });

    console.log('Current Explore DOM state:', JSON.stringify(stateRes.result?.value, null, 2));
    ws.close();
}

main().catch(console.error);
