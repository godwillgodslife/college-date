import { readFileSync } from 'fs';

const res = await fetch(http://localhost:9223/json/list);
const targets = await res.json();
const target = targets[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);

function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
        const cmdId = Math.floor(Math.random() * 100000);
        const handler = (event) => {
            const data = JSON.parse(event.data);
            if (data.id === cmdId) {
                ws.removeEventListener(message, handler);
                if (data.error) reject(data.error);
                else resolve(data.result);
            }
        };
        ws.addEventListener(message, handler);
        ws.send(JSON.stringify({ id: cmdId, method, params }));
    });
}

ws.addEventListener(open, async () => {
    try {
        const script = 
            (function() {
                const passInput = document.querySelector('#new-password');
                const confirmInput = document.querySelector('#confirm-password');
                const submitBtn = document.querySelector('button[type=submit]');

                if (!passInput || !confirmInput || !submitBtn) {
                    return { error: 'Inputs not found' };
                }

                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                
                nativeSetter.call(passInput, 'CollegeDate2026!');
                passInput.dispatchEvent(new Event('input', { bubbles: true }));

                nativeSetter.call(confirmInput, 'CollegeDate2026!');
                confirmInput.dispatchEvent(new Event('input', { bubbles: true }));

                submitBtn.click();
                return { success: true, clicked: submitBtn.innerText };
            })()
        ;

        const result = await sendCommand(Runtime.evaluate, {
            expression: script,
            returnByValue: true,
            awaitPromise: true
        });
        console.log(Submit result:, result.result?.value);
    } catch (err) {
        console.error(Error:, err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
