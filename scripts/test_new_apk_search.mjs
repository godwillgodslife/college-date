import WebSocket from 'ws';
import { execSync } from 'child_process';
import path from 'path';

async function main() {
    // 1. Forward port
    const adb = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
    const out = execSync(`"${adb}" -s emulator-5554 shell "cat /proc/net/unix"`).toString();
    const match = out.match(/@(webview_devtools_remote_\d+)/);
    if (!match) throw new Error('No webview socket');
    execSync(`"${adb}" -s emulator-5554 forward tcp:9222 localabstract:${match[1]}`);

    // 2. Connect
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

    // Step 1: Navigate to /explore
    console.log('Navigating to /explore...');
    await send('Runtime.evaluate', {
        expression: `window.location.href = '/explore'`,
        returnByValue: true
    });
    await new Promise(r => setTimeout(r, 3000));

    // Step 2: Check current explore cards
    const initialCards = await send('Runtime.evaluate', {
        expression: `(() => Array.from(document.querySelectorAll('.explore-card')).map(c => c.querySelector('.card-info h3')?.innerText))()`,
        returnByValue: true
    });
    console.log('Initial explore cards:', initialCards.result?.value);

    // Step 3: Type "Queen" into input and click search submit button
    console.log('Searching for "Queen"...');
    const searchRes = await send('Runtime.evaluate', {
        expression: `(async () => {
            const input = document.querySelector('.explore-search-input');
            const submitBtn = document.querySelector('.search-submit-btn');

            // Set input value using prototype setter
            const proto = Object.getPrototypeOf(input);
            const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
            setter.call(input, 'Queen');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            await new Promise(r => setTimeout(r, 200));

            submitBtn.click();

            // Wait 3s for search results
            await new Promise(r => setTimeout(r, 3500));

            const cards = Array.from(document.querySelectorAll('.explore-card')).map(c => ({
                name: c.querySelector('.card-info h3')?.innerText,
                school: c.querySelector('.card-info p')?.innerText,
                img: c.querySelector('img')?.src
            }));
            const feedback = document.querySelector('.search-results-feedback')?.innerText;
            const empty = document.querySelector('.empty-discovery')?.innerText;

            return { inputVal: input.value, cardsCount: cards.length, cards, feedback, empty };
        })()`,
        returnByValue: true,
        awaitPromise: true
    });
    console.log('Search "Queen" result:', JSON.stringify(searchRes.result?.value, null, 2));

    ws.close();
}

main().catch(console.error);
