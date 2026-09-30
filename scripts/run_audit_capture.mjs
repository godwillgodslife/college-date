import WebSocket from 'ws';

async function connectCDP(port = '9224') {
    const res = await fetch(`http://127.0.0.1:${port}/json`);
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('No page target found');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(resolve => ws.on('open', resolve));

    let nextId = 1;
    const callbacks = new Map();
    const eventListeners = new Set();

    ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.id && callbacks.has(msg.id)) {
            const cb = callbacks.get(msg.id);
            callbacks.delete(msg.id);
            if (msg.error) cb.reject(msg.error);
            else cb.resolve(msg.result);
        } else if (msg.method) {
            for (const listener of eventListeners) {
                listener(msg);
            }
        }
    });

    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = nextId++;
            callbacks.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    return { ws, send, addEventListener: (fn) => eventListeners.add(fn), removeEventListener: (fn) => eventListeners.delete(fn) };
}

async function evalInPage(send, expression) {
    const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
    });
    if (res?.exceptionDetails) {
        throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res?.result?.value;
}

async function runAudit() {
    console.log('Connecting to emulator-5558 via CDP port 9224...');
    const { ws, send, addEventListener } = await connectCDP('9224');

    await send('Network.enable');
    await send('Page.enable');
    await send('Runtime.enable');

    console.log('Instrumenting network tracking...');
    const networkLog = [];
    addEventListener((msg) => {
        if (msg.method === 'Network.requestWillBeSent') {
            networkLog.push({
                type: 'request',
                requestId: msg.params.requestId,
                url: msg.params.request.url,
                method: msg.params.request.method,
                timestamp: msg.params.timestamp,
                initiator: msg.params.initiator.type
            });
        } else if (msg.method === 'Network.responseReceived') {
            const req = networkLog.find(r => r.requestId === msg.params.requestId);
            if (req) {
                req.status = msg.params.response.status;
                req.mimeType = msg.params.response.mimeType;
                req.headers = msg.params.response.headers;
                req.contentLength = msg.params.response.headers['content-length'] || msg.params.response.encodedDataLength;
                req.responseTimestamp = msg.params.timestamp;
            }
        } else if (msg.method === 'Network.loadingFinished') {
            const req = networkLog.find(r => r.requestId === msg.params.requestId);
            if (req) {
                req.encodedDataLength = msg.params.encodedDataLength;
                req.durationMs = req.responseTimestamp ? Math.round((req.responseTimestamp - req.timestamp) * 1000) : null;
            }
        }
    });

    const screensToAudit = [
        { name: 'Chat Inbox', path: '/chat' },
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Match / Discovery Deck', path: '/match' },
        { name: 'Explore Grid', path: '/explore' },
        { name: 'Requests / Admirers', path: '/requests' },
        { name: 'Wallet & Escrow', path: '/wallet' },
        { name: 'Confessions', path: '/confessions' },
        { name: 'Leaderboard', path: '/leaderboard' },
        { name: 'Profile', path: '/profile' }
    ];

    const results = [];

    for (const screen of screensToAudit) {
        console.log(`\n=== Auditing Screen: ${screen.name} (${screen.path}) ===`);
        const startIndex = networkLog.length;
        const t0 = Date.now();

        // Navigate using client-side pushState / history
        await evalInPage(send, `window.history.pushState({}, '', '${screen.path}'); window.dispatchEvent(new PopStateEvent('popstate'));`);
        
        // Wait 3.5 seconds for all initial requests, renders, and idle tasks to complete
        await new Promise(r => setTimeout(r, 3500));
        const duration = Date.now() - t0;

        const screenRequests = networkLog.slice(startIndex);
        const supabaseReqs = screenRequests.filter(r => r.url.includes('supabase.co'));
        const imageReqs = screenRequests.filter(r => r.url.includes('/storage/v1/object/public/profile-photos') || r.mimeType?.startsWith('image/'));
        const restReqs = screenRequests.filter(r => r.url.includes('/rest/v1/'));
        const edgeFnReqs = screenRequests.filter(r => r.url.includes('/functions/v1/'));

        let totalBytes = screenRequests.reduce((acc, r) => acc + (Number(r.encodedDataLength || r.contentLength || 0)), 0);

        // Capture DOM nodes count and memory
        const clientInfo = await evalInPage(send, `(() => {
            return {
                domNodes: document.querySelectorAll('*').length,
                imagesCount: document.querySelectorAll('img').length,
                renderedCards: document.querySelectorAll('.swipe-card, .conversation-item, .confession-card, .leader-card, .request-card, .grid-card').length,
                title: document.title,
                pathname: window.location.pathname
            };
        })()`);

        console.log(`  Path: ${clientInfo.pathname}`);
        console.log(`  Total Requests: ${screenRequests.length} (Supabase: ${supabaseReqs.length})`);
        console.log(`  REST API calls: ${restReqs.length}`);
        console.log(`  Images downloaded: ${imageReqs.length}`);
        console.log(`  Edge Function calls: ${edgeFnReqs.length}`);
        console.log(`  Total Payload: ${(totalBytes / 1024).toFixed(1)} KB`);
        console.log(`  DOM Nodes: ${clientInfo.domNodes} (Images on page: ${clientInfo.imagesCount})`);

        results.push({
            screen: screen.name,
            path: screen.path,
            totalRequests: screenRequests.length,
            supabaseRequests: supabaseReqs.length,
            restRequests: restReqs.length,
            imageRequests: imageReqs.length,
            edgeFunctionRequests: edgeFnReqs.length,
            totalBytes,
            domNodes: clientInfo.domNodes,
            requests: screenRequests.map(r => ({
                method: r.method,
                url: r.url.replace('https://gedoyoleoscgxgdqszzc.supabase.co', ''),
                status: r.status,
                size: r.encodedDataLength || r.contentLength || 0,
                durationMs: r.durationMs
            }))
        });
    }

    ws.close();
    return results;
}

runAudit().then(res => {
    console.log('\n================ AUDIT SUMMARY COMPLETED ================');
    console.log(JSON.stringify(res.map(r => ({
        screen: r.screen,
        totalReqs: r.totalRequests,
        supabaseReqs: r.supabaseRequests,
        restReqs: r.restRequests,
        imageReqs: r.imageRequests,
        kb: (r.totalBytes / 1024).toFixed(1),
        domNodes: r.domNodes
    })), null, 2));
    process.exit(0);
}).catch(err => {
    console.error('Audit failed:', err);
    process.exit(1);
});
