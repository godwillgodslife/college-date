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
    console.log(`Connecting to page: ${page.title} (${page.url})`);
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

    async function captureScreenshot(filepath) {
        await send('Page.enable');
        const res = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(filepath, Buffer.from(res.data, 'base64'));
        console.log(`Saved screenshot: ${filepath}`);
    }

    console.log('Navigating to /explore...');
    await evaluate(`window.location.hash = ''; window.history.pushState({}, '', '/explore'); window.dispatchEvent(new PopStateEvent('popstate'));`);
    await new Promise(r => setTimeout(r, 2500));

    // Check URL
    const currentUrl = await evaluate('window.location.href');
    console.log(`Current URL: ${currentUrl}`);

    // Check camera buttons in DOM
    const cameraAudit = await evaluate(`(() => {
        const searchInput = document.querySelector('.explore-search-input');
        const searchContainer = document.querySelector('.explore-search-container');
        const searchCameraBtn = document.querySelector('.search-camera-btn');
        const categoryChips = Array.from(document.querySelectorAll('.category-chip')).map(c => c.textContent.trim());
        const finderChip = document.querySelector('.category-chip-finder');
        const searchRowButtons = Array.from(document.querySelectorAll('.explore-search-row button')).map(b => b.textContent.trim());

        return {
            hasSearchInput: Boolean(searchInput),
            hasSearchContainer: Boolean(searchContainer),
            hasDuplicateSearchCameraBtn: Boolean(searchCameraBtn),
            hasCategoryFinderChip: Boolean(finderChip),
            finderChipText: finderChip ? finderChip.textContent.trim() : null,
            categoryChips,
            searchRowButtons
        };
    })()`);
    console.log('Camera Audit Results:', JSON.stringify(cameraAudit, null, 2));

    const artifactDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\5f4983c3-95fd-4576-aeb7-98414136103b';
    const publicEvidenceDir = path.resolve('public/evidence_qa');

    // Screenshot 1: Clean Explore Page
    await captureScreenshot(path.join(artifactDir, 'evidence_42_explore_single_camera_live.png'));
    await captureScreenshot(path.join(publicEvidenceDir, 'evidence_42_explore_single_camera_live.png'));

    // Step 2: Trigger search that returns empty state to inspect contrast
    console.log('Testing empty search state contrast...');
    await evaluate(`(() => {
        const input = document.querySelector('.explore-search-input');
        if (input) {
            input.value = 'XYZNonExistentStudent12345';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            const form = document.querySelector('.explore-search-form');
            if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
    })()`);
    await new Promise(r => setTimeout(r, 2000));

    const emptyStateAudit = await evaluate(`(() => {
        const emptyBox = document.querySelector('.empty-discovery');
        if (!emptyBox) return null;
        const h2 = emptyBox.querySelector('h2');
        const p = emptyBox.querySelector('p');
        const computedH2 = h2 ? window.getComputedStyle(h2) : null;
        const computedP = p ? window.getComputedStyle(p) : null;
        return {
            h2Text: h2 ? h2.textContent : null,
            pText: p ? p.textContent : null,
            h2Color: computedH2 ? computedH2.color : null,
            pColor: computedP ? computedP.color : null
        };
    })()`);
    console.log('Empty State Audit:', JSON.stringify(emptyStateAudit, null, 2));

    // Screenshot 2: Empty Search State
    await captureScreenshot(path.join(artifactDir, 'evidence_44_explore_empty_state_contrast_live.png'));
    await captureScreenshot(path.join(publicEvidenceDir, 'evidence_44_explore_empty_state_contrast_live.png'));

    // Step 3: Test atomic reset (Click Show All Profiles)
    console.log('Testing atomic reset (Show All Profiles)...');
    await evaluate(`(() => {
        const showAllBtn = document.querySelector('.empty-discovery button.btn-primary');
        if (showAllBtn) showAllBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1500));

    // Step 4: Open Campus Finder Modal via the single category chip
    console.log('Opening Campus Finder modal via category chip...');
    await evaluate(`(() => {
        const chip = document.querySelector('.category-chip-finder');
        if (chip) chip.click();
    })()`);
    await new Promise(r => setTimeout(r, 1500));

    const modalAudit = await evaluate(`(() => {
        const modal = document.querySelector('.campus-finder-overlay') || document.querySelector('.campus-finder-container');
        return {
            hasModal: Boolean(modal),
            modalVisible: modal ? window.getComputedStyle(modal).display !== 'none' : false
        };
    })()`);
    console.log('Campus Finder Modal Audit:', JSON.stringify(modalAudit, null, 2));

    // Screenshot 3: Campus Finder Modal Live
    await captureScreenshot(path.join(artifactDir, 'evidence_45_campus_finder_modal_live.png'));
    await captureScreenshot(path.join(publicEvidenceDir, 'evidence_45_campus_finder_modal_live.png'));

    ws.close();
    console.log('Explore emulator verification complete!');
}

main().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
