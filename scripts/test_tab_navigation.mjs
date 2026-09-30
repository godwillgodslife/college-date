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

    let id = 3000;
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

    console.log('--- Dismissing Tour Modal ---');
    await evalExpr(`
        (function() {
            // Dismiss tour
            const closeBtn = document.querySelector('button[aria-label="Close"], .tour-close-btn, .tour-overlay button, .tour-card button');
            if (closeBtn) closeBtn.click();
            localStorage.setItem('tcd_tour_seen', 'true');
            localStorage.setItem('college_date_tour_completed', 'true');
        })()
    `);
    await new Promise(r => setTimeout(r, 1000));
    captureScreenshot('evidence_qa_07_dashboard_active.png');

    console.log('--- Navigating to /match ---');
    await evalExpr(`
        (function() {
            window.history.pushState({}, '', '/match');
            window.dispatchEvent(new PopStateEvent('popstate'));
        })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    console.log('Current URL:', await evalExpr('window.location.href'));
    captureScreenshot('evidence_qa_08_match_stack.png');

    console.log('--- Navigating to /chat ---');
    await evalExpr(`
        (function() {
            window.history.pushState({}, '', '/chat');
            window.dispatchEvent(new PopStateEvent('popstate'));
        })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    console.log('Current URL:', await evalExpr('window.location.href'));
    captureScreenshot('evidence_qa_09_chat_conversations.png');

    console.log('--- Navigating to /requests ---');
    await evalExpr(`
        (function() {
            window.history.pushState({}, '', '/requests');
            window.dispatchEvent(new PopStateEvent('popstate'));
        })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    console.log('Current URL:', await evalExpr('window.location.href'));
    captureScreenshot('evidence_qa_10_requests_page.png');

    console.log('--- Navigating to /settings ---');
    await evalExpr(`
        (function() {
            window.history.pushState({}, '', '/settings');
            window.dispatchEvent(new PopStateEvent('popstate'));
        })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    console.log('Current URL:', await evalExpr('window.location.href'));
    
    // Scroll down to Legal section
    await evalExpr(`
        (function() {
            window.scrollTo({ top: 1200, behavior: 'instant' });
        })()
    `);
    await new Promise(r => setTimeout(r, 1000));
    captureScreenshot('evidence_qa_11_settings_legal_section.png');

    ws.close();
    console.log('Tab navigation test completed successfully!');
}

main().catch(console.error);
