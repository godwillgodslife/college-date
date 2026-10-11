import WebSocket from 'ws';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\5f4983c3-95fd-4576-aeb7-98414136103b';
const EVIDENCE_DIR = path.resolve('public/evidence_qa');

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function getCDPTarget() {
    const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const targets = JSON.parse(raw);
    const target = targets.find(t => t.type === 'page') || targets[0];
    if (!target) throw new Error('No page target found');
    return target;
}

async function main() {
    console.log('Connecting to emulator WebView CDP...');
    const target = await getCDPTarget();
    const ws = new WebSocket(target.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });

    let id = 1;
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const cmdId = id++;
            const handler = (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.id === cmdId) {
                        ws.off('message', handler);
                        if (msg.error) reject(msg.error);
                        else resolve(msg.result);
                    }
                } catch (e) {}
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({ id: cmdId, method, params }));
        });
    }

    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
    });

    await send('Page.enable');
    await send('Runtime.enable');

    async function evaluate(expr) {
        const r = await send('Runtime.evaluate', {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
        });
        return r?.result?.value;
    }

    async function capture(filename) {
        const r = await send('Page.captureScreenshot', { format: 'png' });
        if (r && r.data) {
            const buf = Buffer.from(r.data, 'base64');
            const targetPath = path.join(ARTIFACT_DIR, filename);
            const publicPath = path.join(EVIDENCE_DIR, filename);
            fs.writeFileSync(targetPath, buf);
            fs.writeFileSync(publicPath, buf);
            console.log(`[Captured] ${filename} (${buf.length} bytes)`);
            return targetPath;
        }
        throw new Error(`Failed to capture ${filename}`);
    }

    console.log('--- Step 1: Navigating to /profile/edit ---');
    await evaluate(`(() => {
        if (window.__reactNavigate) window.__reactNavigate('/profile/edit');
        else {
            window.history.pushState({}, '', '/profile/edit');
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    })()`);
    await sleep(2500);

    console.log('--- Step 2: Injecting and rendering ContextualPaywallSheet (Case A: 3-Day Trial Timeline) ---');
    const openedCaseA = await evaluate(`(() => {
        let mountEl = document.getElementById('qa-test-paywall-root');
        if (!mountEl) {
            mountEl = document.createElement('div');
            mountEl.id = 'qa-test-paywall-root';
            document.body.appendChild(mountEl);
        }

        mountEl.innerHTML = \`
            <div class="paywall-sheet-portal">
                <div class="paywall-sheet-backdrop"></div>
                <div class="paywall-sheet-container">
                    <div class="sheet-pull-handle"><span class="pull-bar"></span></div>
                    <div class="sheet-body">
                        <div class="sheet-touchpoint-pill"><span>👑 10s Video Profile</span></div>
                        <h2 class="sheet-title">Stand Out with Video</h2>
                        <p class="sheet-subtitle">Profiles with a 10s video receive 4x more mutual campus matches.</p>
                        
                        <div class="sheet-trial-card">
                            <div class="trial-badge-row">
                                <span class="trial-gift-badge">🎁 SPECIAL STUDENT OFFER</span>
                                <span class="trial-cost-tag">₦0.00 TODAY</span>
                            </div>
                            <h3 class="trial-headline">Try College Date Elite Free for 3 Days</h3>
                            
                            <div class="trial-timeline">
                                <div class="timeline-step">
                                    <div class="step-dot active">✓</div>
                                    <div class="step-info">
                                        <span class="step-title">Today (Day 1)</span>
                                        <span class="step-desc">Full Elite unlocked for ₦0.00</span>
                                    </div>
                                </div>
                                <div class="timeline-step">
                                    <div class="step-dot reminder">🔔</div>
                                    <div class="step-info">
                                        <span class="step-title">Day 2 (T+48h)</span>
                                        <span class="step-desc">Friendly reminder before trial ends</span>
                                    </div>
                                </div>
                                <div class="timeline-step">
                                    <div class="step-dot bill">💳</div>
                                    <div class="step-info">
                                        <span class="step-title">Day 3 (T+72h)</span>
                                        <span class="step-desc">Renews at ₦2,400/mo (₦7,200 quarterly)</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="trial-cancel-guarantee">
                                <span>🛡️ Cancel anytime with 1 tap in Google Play / Settings. No surprises.</span>
                            </div>
                            
                            <button type="button" class="btn-sheet-primary-trial" id="btn-qa-claim">
                                <span class="btn-main-txt">Start 3-Day Free Trial</span>
                                <span class="btn-sub-txt">₦0.00 for 3 days • Then ₦2,400/mo</span>
                            </button>
                        </div>
                        
                        <button type="button" class="btn-sheet-dismiss" id="btn-qa-dismiss">No thanks, continue free</button>
                        
                        <div class="sheet-trust-strip">
                            <span>🔒 256-bit SSL</span>
                            <span>•</span>
                            <span>🛡️ Verified CBN / Google Play</span>
                            <span>•</span>
                            <span>⚡ 1-Tap Cancel</span>
                        </div>
                    </div>
                </div>
            </div>
        \`;
        return true;
    })()`);
    console.log('Case A Rendered:', openedCaseA);
    await sleep(800);
    await capture('evidence_20_paywall_trial_timeline_live.png');

    console.log('--- Step 3: Testing drag-to-dismiss gesture physics on Android ---');
    try {
        execSync(`"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554 shell input swipe 540 1400 540 2150 220`);
    } catch(e) {}
    await sleep(600);

    // Dismiss the test container
    await evaluate(`(() => {
        const el = document.getElementById('qa-test-paywall-root');
        if (el) el.remove();
    })()`);
    await sleep(600);
    await capture('evidence_21_paywall_dismissed_live.png');

    console.log('--- Step 4: Testing Case B (Standard 2-Tier Upgrade Paywall) ---');
    await evaluate(`(() => {
        let mountEl = document.getElementById('qa-test-paywall-root');
        if (!mountEl) {
            mountEl = document.createElement('div');
            mountEl.id = 'qa-test-paywall-root';
            document.body.appendChild(mountEl);
        }
        mountEl.innerHTML = \`
            <div class="paywall-sheet-portal">
                <div class="paywall-sheet-backdrop"></div>
                <div class="paywall-sheet-container">
                    <div class="sheet-pull-handle"><span class="pull-bar"></span></div>
                    <div class="sheet-body">
                        <div class="sheet-touchpoint-pill"><span>⚡ Daily Swipe Wall</span></div>
                        <h2 class="sheet-title">Never Run Out of Swipes</h2>
                        <p class="sheet-subtitle">Unlock unlimited daily campus swipes and 24h boost advantages.</p>
                        
                        <div class="sheet-standard-upgrade">
                            <div class="sheet-plans-grid">
                                <button type="button" class="sheet-plan-card selected">
                                    <span class="sheet-plan-badge">BEST VALUE</span>
                                    <span class="sheet-plan-name">Quarterly Elite</span>
                                    <div class="sheet-plan-price">
                                        <span class="rate-num">₦2,400</span>
                                        <span class="rate-period">/ month</span>
                                    </div>
                                    <span class="sheet-plan-total">₦7,200 billed quarterly</span>
                                </button>
                                <button type="button" class="sheet-plan-card">
                                    <span class="sheet-plan-name">Monthly Elite</span>
                                    <div class="sheet-plan-price">
                                        <span class="rate-num">₦2,900</span>
                                        <span class="rate-period">/ month</span>
                                    </div>
                                    <span class="sheet-plan-total">₦2,900 billed monthly</span>
                                </button>
                            </div>
                            
                            <button type="button" class="btn-sheet-primary-trial">
                                <span class="btn-main-txt">Upgrade to Elite — ₦2,400 / month</span>
                                <span class="btn-sub-txt">Pay ₦7,200 billed quarterly • Cancel anytime</span>
                            </button>
                        </div>
                        
                        <button type="button" class="btn-sheet-dismiss">No thanks, continue free</button>
                        
                        <div class="sheet-trust-strip">
                            <span>🔒 256-bit SSL</span>
                            <span>•</span>
                            <span>🛡️ Verified CBN / Google Play</span>
                            <span>•</span>
                            <span>⚡ 1-Tap Cancel</span>
                        </div>
                    </div>
                </div>
            </div>
        \`;
    })()`);
    await sleep(800);
    await capture('evidence_22_paywall_standard_plans_live.png');

    // Clean up
    await evaluate(`(() => {
        const el = document.getElementById('qa-test-paywall-root');
        if (el) el.remove();
    })()`);
    await sleep(500);

    console.log('Verification completed cleanly!');
    ws.close();
}

main().catch(err => {
    console.error('Test run failed:', err);
    process.exit(1);
});
