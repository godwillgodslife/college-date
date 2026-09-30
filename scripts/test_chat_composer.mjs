import http from 'http';
import { execSync } from 'child_process';

const adb = `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`;

function getTargets() {
    return new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

function captureScreenshot(filename) {
    execSync(`"${adb}" shell screencap -p /sdcard/${filename}`);
    execSync(`"${adb}" pull /sdcard/${filename} ${filename}`);
    console.log(`Captured screenshot: ${filename}`);
}

async function main() {
    const targets = await getTargets();
    const page = targets.find(t => t.type === 'page') || targets[0];
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 4000;
    function evalExpr(expr) {
        return new Promise(resolve => {
            const cur = ++id;
            ws.addEventListener('message', function h(e) {
                const m = JSON.parse(e.data);
                if (m.id === cur) {
                    ws.removeEventListener('message', h);
                    resolve(m.result?.result?.value);
                }
            });
            ws.send(JSON.stringify({ id: cur, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
        });
    }

    console.log('--- Navigating to /chat ---');
    await evalExpr(`
        (function() {
            window.history.pushState({}, '', '/chat');
            window.dispatchEvent(new PopStateEvent('popstate'));
        })()
    `);
    await new Promise(r => setTimeout(r, 1500));

    console.log('--- Clicking first conversation ---');
    const clicked = await evalExpr(`
        (function() {
            const convItem = document.querySelector('.conversation-item');
            if (convItem) {
                convItem.click();
                return true;
            }
            return false;
        })()
    `);
    console.log('Conversation clicked:', clicked);
    await new Promise(r => setTimeout(r, 2000));
    console.log('URL inside conversation:', await evalExpr('window.location.href'));

    captureScreenshot('evidence_qa_20_chat_room.png');

    console.log('--- Focusing Chat Composer Input ---');
    await evalExpr(`
        (function() {
            const input = document.querySelector('.chat-input-textarea, textarea, .chat-input-area input');
            if (input) {
                input.focus();
            }
        })()
    `);
    await new Promise(r => setTimeout(r, 1000));
    captureScreenshot('evidence_qa_21_chat_keyboard_active.png');

    ws.close();
}

main().catch(console.error);
