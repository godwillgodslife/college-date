import WebSocket from 'ws';
import { execSync } from 'child_process';
import path from 'path';

const ADB = `"${path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe')}" -s emulator-5554`;

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

    console.log('1. Clicking clear button...');
    await send('Runtime.evaluate', {
        expression: `(() => {
            const clearBtn = document.querySelector('.search-clear-btn') || document.querySelector('.btn-clear-search-link');
            if (clearBtn) clearBtn.click();
            return { hasClear: !!clearBtn };
        })()`,
        returnByValue: true
    });

    await new Promise(r => setTimeout(r, 1500));

    // Capture screen after clear
    execSync(`"${path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe')}" -s emulator-5554 exec-out screencap -p > screen_explore_cleared.png`);
    console.log('2. Captured screen_explore_cleared.png');

    // 3. Search for "Queen" by setting value and triggering form submit
    console.log('3. Searching for "Queen"...');
    const searchRes = await send('Runtime.evaluate', {
        expression: `(async () => {
            const input = document.querySelector('.explore-search-input');
            const form = document.querySelector('.explore-search-form');
            const submitBtn = document.querySelector('.search-submit-btn');

            // Focus and clear via native setter
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(input, 'Queen');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            // Wait a tick for React state
            await new Promise(r => setTimeout(r, 100));

            // Submit
            submitBtn.click();

            // Wait 3s for search completion
            await new Promise(r => setTimeout(r, 3000));

            const cards = Array.from(document.querySelectorAll('.explore-card')).map(c => ({
                title: c.querySelector('.card-info h3')?.innerText,
                school: c.querySelector('.card-info p')?.innerText
            }));
            const feedback = document.querySelector('.search-results-feedback')?.innerText;
            const empty = document.querySelector('.empty-discovery')?.innerText;

            return { inputVal: input.value, cardCount: cards.length, cards, feedback, empty };
        })()`,
        returnByValue: true,
        awaitPromise: true
    });

    console.log('Search result:', JSON.stringify(searchRes.result?.value, null, 2));

    // 4. Capture search results
    execSync(`"${path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe')}" -s emulator-5554 exec-out screencap -p > screen_explore_searched_queen.png`);
    console.log('4. Captured screen_explore_searched_queen.png');

    ws.close();
}

main().catch(console.error);
