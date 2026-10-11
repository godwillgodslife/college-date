import WebSocket from 'ws';
import { execSync } from 'child_process';
import path from 'path';

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

    // 1. Clear search first
    console.log('1. Clearing search...');
    await send('Runtime.evaluate', {
        expression: `(() => {
            const clearBtn = document.querySelector('.search-clear-btn');
            if (clearBtn) clearBtn.click();
            const link = document.querySelector('.btn-clear-search-link');
            if (link) link.click();
        })()`,
        returnByValue: true
    });
    await new Promise(r => setTimeout(r, 1000));

    // 2. Type "Queen" and wait for debouncer (500ms)
    console.log('2. Setting input to "Queen"...');
    await send('Runtime.evaluate', {
        expression: `(() => {
            const input = document.querySelector('.explore-search-input');
            const proto = Object.getPrototypeOf(input);
            const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
            setter.call(input, 'Queen');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        })()`,
        returnByValue: true
    });

    // Wait 4 seconds for debounce + network fetch
    console.log('3. Waiting for debounce + search results...');
    await new Promise(r => setTimeout(r, 4000));

    const checkRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const input = document.querySelector('.explore-search-input');
            const cards = Array.from(document.querySelectorAll('.explore-card')).map(c => ({
                name: c.querySelector('.card-info h3')?.innerText,
                school: c.querySelector('.card-info p')?.innerText,
                img: c.querySelector('img')?.src
            }));
            const feedback = document.querySelector('.search-results-feedback')?.innerText;
            const empty = document.querySelector('.empty-discovery')?.innerText;
            return {
                val: input?.value,
                count: cards.length,
                cards,
                feedback,
                empty
            };
        })()`,
        returnByValue: true
    });

    console.log('Debounced search result:', JSON.stringify(checkRes.result?.value, null, 2));

    // Capture screenshot
    execSync(`"${path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe')}" -s emulator-5554 exec-out screencap -p > test_queen_results.png`);
    console.log('Captured test_queen_results.png');

    ws.close();
}

main().catch(console.error);
