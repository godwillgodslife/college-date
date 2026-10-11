import WebSocket from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';

async function getPageTarget() {
    return new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const list = JSON.parse(data);
                const page = list.find(t => t.type === 'page');
                if (page) resolve(page);
                else reject(new Error('No page target found'));
            });
        }).on('error', reject);
    });
}

async function main() {
    const page = await getPageTarget();
    const ws = new WebSocket(page.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });
    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
    });

    let msgId = 1;
    function send(method, params = {}) {
        return new Promise((resolve) => {
            const id = msgId++;
            const handler = (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.id === id) {
                    ws.off('message', handler);
                    resolve(msg.result);
                }
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async function evaluate(expression) {
        const res = await send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        return res?.result?.value;
    }

    async function captureScreenshot(filename) {
        await send('Page.enable');
        const res = await send('Page.captureScreenshot', { format: 'png' });
        const brainPath = path.join('C:\\Users\\DELL\\.gemini\\antigravity\\brain\\5f4983c3-95fd-4576-aeb7-98414136103b', filename);
        const publicPath = path.resolve('public/evidence_qa', filename);
        fs.writeFileSync(brainPath, Buffer.from(res.data, 'base64'));
        fs.writeFileSync(publicPath, Buffer.from(res.data, 'base64'));
        console.log(`Saved screenshot: ${filename}`);
    }

    // 1. Close any open modal first
    console.log('Closing any open modal...');
    await evaluate(`(() => {
        const closeBtn = document.querySelector('.campus-finder-close-btn') || document.querySelector('.modal-close');
        if (closeBtn) closeBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    // 2. Ensure we are on /explore with fresh state
    console.log('Ensuring clean /explore page...');
    await evaluate(`(() => {
        const clearBtn = document.querySelector('.search-clear-btn');
        if (clearBtn) clearBtn.click();
        const input = document.querySelector('.explore-search-input');
        if (input) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    // Capture clean Explore page
    await captureScreenshot('evidence_46_explore_clean_single_camera.png');

    // 3. Test empty search query to capture high-contrast empty state
    console.log('Testing empty search query...');
    await evaluate(`(() => {
        const input = document.querySelector('.explore-search-input');
        if (input) {
            input.value = 'NonExistentXYZ999';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            const form = document.querySelector('.explore-search-form');
            if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
    })()`);
    await new Promise(r => setTimeout(r, 1500));

    // Capture high contrast empty search state
    await captureScreenshot('evidence_47_explore_high_contrast_empty_state.png');

    // 4. Reset search by clicking Show All Profiles
    console.log('Resetting search via Show All Profiles...');
    await evaluate(`(() => {
        const showAllBtn = document.querySelector('.empty-discovery button.btn-primary');
        if (showAllBtn) showAllBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    // 5. Open Campus Finder modal via category chip
    console.log('Opening Campus Finder modal via category chip...');
    await evaluate(`(() => {
        const chip = document.querySelector('.category-chip-finder');
        if (chip) chip.click();
    })()`);
    await new Promise(r => setTimeout(r, 1200));

    // Capture Campus Finder Modal
    await captureScreenshot('evidence_48_campus_finder_modal_opened.png');

    ws.close();
    console.log('All proofs captured successfully!');
}

main().catch(console.error);
