import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\bb74e284-b1b3-4e28-88e6-96344044680e';
const PORT = process.env.CDP_PORT || '9222';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log(`Connecting to CDP target on port ${PORT}...`);
    const res = await fetch(`http://localhost:${PORT}/json/list`);
    const targets = await res.json();
    const target = targets.find(t => t.type === 'page') || targets[0];
    if (!target) {
        throw new Error('No target page found');
    }
    console.log('Target found:', target.title, target.url);

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let id = 1;

    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const cmdId = id++;
            const handler = (event) => {
                const data = JSON.parse(event.data);
                if (data.id === cmdId) {
                    ws.removeEventListener('message', handler);
                    if (data.error) reject(data.error);
                    else resolve(data.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id: cmdId, method, params }));
        });
    }

    await new Promise((resolve, reject) => {
        ws.addEventListener('open', resolve);
        ws.addEventListener('error', reject);
    });

    await send('Page.enable');
    await send('Runtime.enable');

    async function evaluate(expr) {
        const res = await send('Runtime.evaluate', {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
        });
        return res?.result?.value;
    }

    async function capture(filename) {
        const res = await send('Page.captureScreenshot', { format: 'png' });
        if (res && res.data) {
            const buf = Buffer.from(res.data, 'base64');
            const localPath = path.resolve(filename);
            fs.writeFileSync(localPath, buf);
            const artifactPath = path.join(ARTIFACT_DIR, path.basename(filename));
            fs.writeFileSync(artifactPath, buf);
            console.log(`[CAPTURED] ${filename} (${buf.length} bytes)`);
        }
    }

    async function navigateTo(targetPath) {
        console.log(`Navigating to ${targetPath}...`);
        await evaluate(`(() => {
            if (window.__reactNavigate) {
                window.__reactNavigate('${targetPath}');
            } else {
                window.location.href = '${targetPath}';
            }
        })()`);
        await sleep(3000);
    }

    const currentUrl = await evaluate('window.location.href');
    console.log('Current URL:', currentUrl);

    // If on login page, fill credentials and submit
    if (currentUrl.includes('/login') || currentUrl.endsWith('/')) {
        console.log('Logging in with verified test credentials...');
        const loginRes = await evaluate(`(async () => {
            const setValue = (el, val) => {
                const proto = Object.getPrototypeOf(el);
                const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
                setter.call(el, val);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            };

            const emailInput = document.querySelector('#email') || document.querySelector('input[type="email"]');
            const passInput = document.querySelector('#password') || document.querySelector('input[type="password"]');
            const submitBtn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('sign in'));

            if (!emailInput || !passInput || !submitBtn) {
                return { error: 'Inputs not found', email: !!emailInput, pass: !!passInput, btn: !!submitBtn };
            }

            setValue(emailInput, 'student.tester2026@gmail.com');
            setValue(passInput, 'CollegeDate2026!VerifiedPass');
            await new Promise(r => setTimeout(r, 300));
            submitBtn.click();
            return { submitted: true };
        })()`);
        console.log('Login trigger:', loginRes);

        // Wait for auth to complete
        for (let i = 0; i < 15; i++) {
            await sleep(1000);
            const pathName = await evaluate('window.location.pathname');
            console.log(`Waiting for auth... (${i}s) current path: ${pathName}`);
            if (pathName && pathName !== '/login' && pathName !== '/') {
                break;
            }
        }
    }

    // Dismiss any modals / tours
    await evaluate(`(() => {
        localStorage.setItem('hasSeenAppTour', 'true');
        const modalBtn = document.querySelector('.tour-modal button, .welcome-modal button, .guide-modal button');
        if (modalBtn) modalBtn.click();
    })()`);
    await sleep(1500);

    // Ensure Light Mode first
    console.log('Setting Light Mode...');
    await evaluate(`(() => {
        document.documentElement.setAttribute('data-theme', 'light');
        document.body.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    })()`);
    await sleep(1000);

    // 1. Dashboard (Light Mode)
    await navigateTo('/dashboard');
    await sleep(2500);
    await capture('evidence_01_light_dashboard.png');

    // 2. Match / Discovery (Light Mode)
    await navigateTo('/match');
    await sleep(2500);
    await capture('evidence_02_light_match.png');

    // 3. Requests (Light Mode)
    await navigateTo('/requests');
    await sleep(2500);
    await capture('evidence_03_light_requests.png');

    // 4. Premium (Light Mode)
    await navigateTo('/premium');
    await sleep(2500);
    await capture('evidence_04_light_premium.png');

    // 5. Referrals (Light Mode)
    await navigateTo('/referrals');
    await sleep(2500);
    await capture('evidence_05_light_referrals.png');

    // 6. Leaderboard (Light Mode)
    await navigateTo('/leaderboard');
    await sleep(2500);
    await capture('evidence_06_light_leaderboard.png');

    // 7. Dark Mode Verification
    console.log('Setting Dark Mode...');
    await evaluate(`(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    })()`);
    await sleep(1000);

    // 8. Match / Discovery (Dark Mode)
    await navigateTo('/match');
    await sleep(2500);
    await capture('evidence_07_dark_match.png');

    // 9. Premium (Dark Mode)
    await navigateTo('/premium');
    await sleep(2500);
    await capture('evidence_08_dark_premium.png');

    console.log('All screen captures successfully saved!');
    ws.close();
}

main().catch(err => {
    console.error('Execution error:', err);
    process.exit(1);
});
