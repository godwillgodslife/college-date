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

    // Inspect the React fiber of Explore component directly
    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            const input = document.querySelector('.explore-search-input');
            const form = document.querySelector('.explore-search-form');
            
            // Inspect React Props on form or input
            const inputPropsKey = Object.keys(input || {}).find(k => k.startsWith('__reactProps'));
            const formPropsKey = Object.keys(form || {}).find(k => k.startsWith('__reactProps'));

            const inputProps = input ? input[inputPropsKey] : null;
            const formProps = form ? form[formPropsKey] : null;

            return {
                inputPropsValue: inputProps?.value,
                inputHasOnChange: !!inputProps?.onChange,
                inputHasOnKeyDown: !!inputProps?.onKeyDown,
                formHasOnSubmit: !!formProps?.onSubmit
            };
        })()`,
        returnByValue: true
    });

    console.log('React Props:', res.result?.value);

    // Call the React onChange handler directly!
    const directChangeRes = await send('Runtime.evaluate', {
        expression: `(async () => {
            const input = document.querySelector('.explore-search-input');
            const inputPropsKey = Object.keys(input || {}).find(k => k.startsWith('__reactProps'));
            const inputProps = input ? input[inputPropsKey] : null;
            if (!inputProps?.onChange) return 'No onChange';

            console.log('Calling onChange with "Queen"...');
            inputProps.onChange({ target: { value: 'Queen' } });

            await new Promise(r => setTimeout(r, 4000));

            const cards = Array.from(document.querySelectorAll('.explore-card')).map(c => ({
                name: c.querySelector('.card-info h3')?.innerText,
                school: c.querySelector('.card-info p')?.innerText,
                img: c.querySelector('img')?.src
            }));
            const feedback = document.querySelector('.search-results-feedback')?.innerText;
            const empty = document.querySelector('.empty-discovery')?.innerText;

            return {
                cardsCount: cards.length,
                cards,
                feedback,
                empty
            };
        })()`,
        returnByValue: true,
        awaitPromise: true
    });

    console.log('Direct onChange result:', JSON.stringify(directChangeRes.result?.value, null, 2));
    ws.close();
}

main().catch(console.error);
