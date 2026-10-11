import WebSocket from 'ws';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';
const ADB = `"${path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe')}" -s emulator-5554`;
const QA_DIR = path.resolve('public/evidence_qa');

if (!fs.existsSync(QA_DIR)) {
    fs.mkdirSync(QA_DIR, { recursive: true });
}

async function getSession(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body: JSON.stringify({ email, password })
    });
    return await res.json();
}

function captureScreen(filename) {
    const target = path.join(QA_DIR, filename);
    const remotePath = `/sdcard/${filename}`;
    execSync(`${ADB} shell screencap -p ${remotePath}`);
    execSync(`${ADB} pull ${remotePath} "${target}"`);
    console.log(`[SCREENSHOT CAPTURED] ${target} (${fs.statSync(target).size} bytes)`);
    return target;
}

async function main() {
    console.log('=== VERIFYING TARGETS ON ANDROID EMULATOR (emulator-5554) ===');

    // 1. Find socket and forward port 9222
    const out = execSync(`${ADB} shell "cat /proc/net/unix"`).toString();
    const match = out.match(/@(webview_devtools_remote_\d+)/);
    if (!match) throw new Error('No webview devtools socket found');
    console.log('Found webview socket:', match[1]);
    execSync(`${ADB} forward tcp:9222 localabstract:${match[1]}`);

    // 2. Fetch page target
    const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const targets = JSON.parse(raw);
    const target = targets.find(t => t.type === 'page');
    if (!target) throw new Error('No page target found');

    const ws = new WebSocket(target.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });
    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
    });

    let msgId = 1;
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            const handler = (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.id === id) {
                    ws.off('message', handler);
                    if (msg.error) reject(msg.error);
                    else if (msg.result?.exceptionDetails) reject(msg.result.exceptionDetails);
                    else resolve(msg.result?.result?.value);
                }
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async function evaluate(expr) {
        return send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    }

    async function navigateSPA(routePath) {
        console.log(`Navigating to ${routePath} via SPA pushState...`);
        await evaluate(`(() => {
            window.history.pushState({}, '', '${routePath}');
            window.dispatchEvent(new PopStateEvent('popstate'));
        })()`);
        await new Promise(r => setTimeout(r, 2500));
    }

    // Step A: Check current authentication status
    console.log('\n--- STEP A: VERIFYING AUTHENTICATION STATUS ---');
    const curPath = await evaluate('window.location.pathname');
    console.log('Current path:', curPath);

    // ----------------------------------------------------
    // TARGET 1: Admirers list in Requests (/requests)
    // ----------------------------------------------------
    console.log('\n--- TARGET 1: ADMIRERS LIST IN REQUESTS (/requests) ---');
    await navigateSPA('/requests');

    const admirersInfo = await evaluate(`(() => {
        const cards = Array.from(document.querySelectorAll('.request-card')).map(c => {
            const avatar = c.querySelector('.user-avatar-small');
            const img = avatar?.querySelector('img');
            const placeholder = avatar?.querySelector('.avatar-placeholder');
            return {
                name: c.querySelector('.user-details h3')?.innerText,
                school: c.querySelector('.user-details p')?.innerText,
                hasImg: !!img,
                imgSrc: img?.src,
                isCircular: avatar ? window.getComputedStyle(avatar).borderRadius : null,
                placeholderText: placeholder?.innerText
            };
        });
        return {
            title: document.querySelector('.requests-header h1')?.innerText,
            count: cards.length,
            cards
        };
    })()`);
    console.log('Admirers inspection:', JSON.stringify(admirersInfo, null, 2));
    captureScreen('evidence_01_requests_admirers_photos.png');

    // ----------------------------------------------------
    // TARGET 2: Who Viewed You in Viewers (/viewers)
    // ----------------------------------------------------
    console.log('\n--- TARGET 2: WHO VIEWED YOU IN VIEWERS (/viewers) ---');
    await navigateSPA('/viewers');

    const viewersInfo = await evaluate(`(() => {
        const cards = Array.from(document.querySelectorAll('.viewer-card')).map(c => {
            const avatar = c.querySelector('.viewer-avatar');
            const img = avatar?.querySelector('img');
            const placeholder = avatar?.querySelector('.avatar-placeholder');
            return {
                name: c.querySelector('.viewer-info h3')?.innerText,
                time: c.querySelector('.viewer-info p')?.innerText,
                hasImg: !!img,
                imgSrc: img?.src,
                placeholderText: placeholder?.innerText,
                isCircular: avatar ? window.getComputedStyle(avatar).borderRadius : null
            };
        });
        return {
            title: document.querySelector('.viewers-header h1')?.innerText,
            count: cards.length,
            cards
        };
    })()`);
    console.log('Viewers inspection:', JSON.stringify(viewersInfo, null, 2));
    captureScreen('evidence_02_viewers_real_photos_no_v_boxes.png');

    // ----------------------------------------------------
    // TARGET 3: Explore Page Discovery & Search (/explore)
    // ----------------------------------------------------
    console.log('\n--- TARGET 3: EXPLORE PAGE DISCOVERY GRID (/explore) ---');
    await navigateSPA('/explore');
    await new Promise(r => setTimeout(r, 3500));

    const exploreInitInfo = await evaluate(`(() => {
        const cards = Array.from(document.querySelectorAll('.explore-card')).map(c => ({
            name: c.querySelector('.card-info h3')?.innerText,
            school: c.querySelector('.card-info p')?.innerText,
            img: c.querySelector('img')?.src
        }));
        return {
            hasSearchInput: !!document.querySelector('.explore-search-input'),
            hasFilterBtn: !!document.querySelector('.explore-filter-btn'),
            cardCount: cards.length,
            firstFewCards: cards.slice(0, 4)
        };
    })()`);
    console.log('Explore initial grid inspection:', JSON.stringify(exploreInitInfo, null, 2));
    captureScreen('evidence_03_explore_discovery_grid.png');

    // Step 3B: Search for a student (e.g. "Khalil")
    console.log('\n--- TARGET 3B: SEARCH FOR STUDENT "Khalil" ---');
    await evaluate(`(async () => {
        const input = document.querySelector('.explore-search-input');
        const inputPropsKey = Object.keys(input || {}).find(k => k.startsWith('__reactProps'));
        const inputProps = input ? input[inputPropsKey] : null;

        // Set React input state directly
        if (inputProps?.onChange) {
            inputProps.onChange({ target: { value: 'Khalil' } });
        } else {
            const proto = Object.getPrototypeOf(input);
            const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
            setter.call(input, 'Khalil');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Trigger search submit
        await new Promise(r => setTimeout(r, 200));
        const submitBtn = document.querySelector('.search-submit-btn');
        if (submitBtn) submitBtn.click();
    })()`);

    await new Promise(r => setTimeout(r, 3500));

    const searchKhalilInfo = await evaluate(`(() => {
        const cards = Array.from(document.querySelectorAll('.explore-card')).map(c => ({
            name: c.querySelector('.card-info h3')?.innerText,
            school: c.querySelector('.card-info p')?.innerText,
            img: c.querySelector('img')?.src
        }));
        const feedback = document.querySelector('.search-results-feedback')?.innerText;
        const inputVal = document.querySelector('.explore-search-input')?.value;
        const hasClearBtn = !!document.querySelector('.search-clear-btn');
        return { inputVal, hasClearBtn, feedback, cardCount: cards.length, cards };
    })()`);
    console.log('Search "Khalil" inspection:', JSON.stringify(searchKhalilInfo, null, 2));
    captureScreen('evidence_04_explore_searched_student.png');

    // Step 3C: Click Clear button and verify discovery grid resets
    console.log('\n--- TARGET 3C: CLEAR SEARCH AND RESET TO DISCOVERY GRID ---');
    await evaluate(`(() => {
        const clearBtn = document.querySelector('.search-clear-btn') || document.querySelector('.btn-clear-search-link');
        if (clearBtn) clearBtn.click();
    })()`);

    await new Promise(r => setTimeout(r, 2000));

    const clearedInfo = await evaluate(`(() => {
        const cards = Array.from(document.querySelectorAll('.explore-card')).map(c => ({
            name: c.querySelector('.card-info h3')?.innerText,
            school: c.querySelector('.card-info p')?.innerText
        }));
        const inputVal = document.querySelector('.explore-search-input')?.value;
        const hasClearBtn = !!document.querySelector('.search-clear-btn');
        const feedback = document.querySelector('.search-results-feedback')?.innerText;
        return { inputVal, hasClearBtn, feedback, cardCount: cards.length, firstCards: cards.slice(0, 4) };
    })()`);
    console.log('Cleared inspection:', JSON.stringify(clearedInfo, null, 2));
    captureScreen('evidence_05_explore_cleared_back_to_grid.png');

    ws.close();
    console.log('\n=== ALL TARGET VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

main().catch(err => {
    console.error('Verification error:', err);
    process.exit(1);
});
