const listRes = await fetch('http://127.0.0.1:9222/json/list');
const targets = await listRes.json();
const page = targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);

function send(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (event) => {
            const data = JSON.parse(event.data);
            if (data.id === id) {
                ws.removeEventListener('message', handler);
                if (data.error) reject(data.error);
                else resolve(data.result);
            }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

ws.addEventListener('open', async () => {
    try {
        const res = await send('Runtime.evaluate', {
            expression: `(async () => {
                const userRes = await window.__supabase?.auth?.getUser();
                const user = userRes?.data?.user;
                const uid = user?.id;
                
                // Read local storage keys
                const storage = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k.includes('discovery') || k.includes('req') || k.includes('seen')) {
                        storage[k] = localStorage.getItem(k);
                    }
                }
                const session = {};
                for (let i = 0; i < sessionStorage.length; i++) {
                    const k = sessionStorage.key(i);
                    session[k] = sessionStorage.getItem(k);
                }

                // Check HTML of activity row
                const activityRow = document.querySelector('.chat-activity-requests-row');
                const likesCircle = document.querySelector('.likes-circle');

                return {
                    url: window.location.href,
                    user: user?.email,
                    uid,
                    storage,
                    session,
                    hasLikesCircle: !!likesCircle,
                    likesCircleOuter: likesCircle ? likesCircle.outerHTML : null,
                    activityRowInner: activityRow ? activityRow.innerHTML : null
                };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('DIAGNOSTIC RESULT:', JSON.stringify(res.result?.value, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        ws.close();
        process.exit(0);
    }
});
