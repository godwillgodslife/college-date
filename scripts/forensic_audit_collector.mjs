import WebSocket from 'ws';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ADB_PATH = process.env.LOCALAPPDATA + '\\Android\\Sdk\\platform-tools\\adb.exe';
const EVIDENCE_DIR = 'public/evidence_audit';

if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function getWebviewTarget() {
    const res = await fetch('http://127.0.0.1:9222/json');
    const targets = await res.json();
    return targets.find(t => t.type === 'page');
}

class DevToolsConnection {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.msgId = 1;
        this.pending = new Map();
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.on('open', resolve);
            this.ws.on('error', reject);
            this.ws.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.id && this.pending.has(msg.id)) {
                    const { resolve, reject } = this.pending.get(msg.id);
                    this.pending.delete(msg.id);
                    if (msg.error) reject(msg.error);
                    else if (msg.result?.exceptionDetails) reject(msg.result.exceptionDetails);
                    else resolve(msg.result?.result?.value);
                }
            });
        });
    }

    async send(method, params = {}) {
        const id = this.msgId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async evaluate(expression) {
        return this.send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
    }

    close() {
        this.ws.close();
    }
}

function captureScreenshot(filename) {
    const localPath = path.join(EVIDENCE_DIR, filename);
    execSync(`"${ADB_PATH}" -s emulator-5554 shell screencap -p /sdcard/screen_tmp.png`);
    execSync(`"${ADB_PATH}" -s emulator-5554 pull /sdcard/screen_tmp.png "${localPath}"`, { stdio: 'ignore' });
    return localPath;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SCREENS = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Match', path: '/match' },
    { name: 'Explore', path: '/explore' },
    { name: 'Chat', path: '/chat' },
    { name: 'Profile', path: '/profile' },
    { name: 'EditProfile', path: '/profile/edit' },
    { name: 'Settings', path: '/settings' },
    { name: 'Referrals', path: '/referrals' },
    { name: 'Wallet', path: '/wallet' },
    { name: 'Requests', path: '/requests' },
    { name: 'Leaderboard', path: '/leaderboard' },
    { name: 'Confessions', path: '/confessions' },
    { name: 'Premium', path: '/premium' },
    { name: 'Viewers', path: '/viewers' },
    { name: 'Notifications', path: '/notifications' },
    { name: 'MiniProfileSetup', path: '/mini-profile-setup' },
    { name: 'OfficialHub', path: '/official' },
    { name: 'Login', path: '/login' },
    { name: 'Signup', path: '/signup' },
    { name: 'ForgotPassword', path: '/forgot-password' }
];

async function inspectScreenDOM(cdp) {
    return cdp.evaluate(`(() => {
        // Collect DOM anomalies
        const issues = [];
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const isLight = theme === 'light';

        // Check horizontal overflow
        const docWidth = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth > docWidth + 2) {
            issues.push({
                type: 'horizontal_overflow',
                detail: 'Document scrollWidth ' + document.documentElement.scrollWidth + ' exceeds clientWidth ' + docWidth
            });
        }

        // Check text contrast anomalies
        const textNodes = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        let node;
        while (node = walker.nextNode()) {
            const style = window.getComputedStyle(node);
            const text = node.innerText?.trim();
            if (text && text.length > 0 && node.children.length === 0) {
                const color = style.color;
                const bg = style.backgroundColor;
                const rect = node.getBoundingClientRect();
                
                // Check if element is visible
                if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
                    // Check for white text in light mode
                    if (isLight) {
                        if (color.includes('255, 255, 255') || color === 'rgb(255, 255, 255)') {
                            // Check parent background
                            let parent = node;
                            let parentBg = bg;
                            while (parent && (parentBg === 'rgba(0, 0, 0, 0)' || parentBg === 'transparent')) {
                                parent = parent.parentElement;
                                if (parent) parentBg = window.getComputedStyle(parent).backgroundColor;
                            }
                            if (parentBg.includes('255, 255, 255') || parentBg.includes('248, 249, 250') || parentBg === 'rgb(255, 255, 255)' || parentBg.includes('rgba(255, 107, 107, 0.16)')) {
                                issues.push({
                                    type: 'white_text_on_light_bg',
                                    text: text.slice(0, 40),
                                    color,
                                    parentBg,
                                    tag: node.tagName
                                });
                            }
                        }
                    }

                    // Check for dark text in dark mode
                    if (!isLight) {
                        if (color === 'rgb(0, 0, 0)' || color === 'rgb(15, 23, 42)' || color === 'rgb(17, 24, 39)') {
                            let parent = node;
                            let parentBg = bg;
                            while (parent && (parentBg === 'rgba(0, 0, 0, 0)' || parentBg === 'transparent')) {
                                parent = parent.parentElement;
                                if (parent) parentBg = window.getComputedStyle(parent).backgroundColor;
                            }
                            if (parentBg.includes('10, 10, 12') || parentBg.includes('19, 19, 24') || parentBg.includes('0, 0, 0')) {
                                issues.push({
                                    type: 'dark_text_on_dark_bg',
                                    text: text.slice(0, 40),
                                    color,
                                    parentBg,
                                    tag: node.tagName
                                });
                            }
                        }
                    }

                    // Check button tap target size (< 40px)
                    if (node.tagName === 'BUTTON' || node.getAttribute('role') === 'button') {
                        if (rect.width < 38 || rect.height < 38) {
                            issues.push({
                                type: 'small_tap_target',
                                text: text.slice(0, 30),
                                width: Math.round(rect.width),
                                height: Math.round(rect.height)
                            });
                        }
                    }
                }
            }
        }

        // Return DOM summary
        return {
            title: document.title,
            theme,
            url: window.location.pathname,
            domNodes: document.querySelectorAll('*').length,
            issues: issues.slice(0, 10)
        };
    })()`);
}

async function runAudit() {
    console.log('--- Starting Forensic Audit Data Collection ---');
    const target = await getWebviewTarget();
    const cdp = new DevToolsConnection(target.webSocketDebuggerUrl);
    await cdp.connect();

    const results = [];

    for (const screen of SCREENS) {
        console.log(`\nAuditing: ${screen.name} (${screen.path})`);
        
        // 1. Navigate
        try {
            await cdp.evaluate(`(() => {
                if (window.__reactNavigate) {
                    window.__reactNavigate('${screen.path}');
                } else {
                    window.location.href = '${screen.path}';
                }
            })()`);
            await sleep(1500);

            // 2. Audit Light Mode
            await cdp.evaluate(`(() => {
                document.documentElement.setAttribute('data-theme', 'light');
                document.documentElement.classList.add('theme-light');
                document.documentElement.classList.remove('theme-dark');
                localStorage.setItem('tcd_theme_preference', 'light');
            })()`);
            await sleep(600);
            const lightFilename = `audit_${screen.name.toLowerCase()}_light.png`;
            captureScreenshot(lightFilename);
            const lightAnalysis = await inspectScreenDOM(cdp);

            // 3. Audit Dark Mode
            await cdp.evaluate(`(() => {
                document.documentElement.setAttribute('data-theme', 'dark');
                document.documentElement.classList.add('theme-dark');
                document.documentElement.classList.remove('theme-light');
                localStorage.setItem('tcd_theme_preference', 'dark');
            })()`);
            await sleep(600);
            const darkFilename = `audit_${screen.name.toLowerCase()}_dark.png`;
            captureScreenshot(darkFilename);
            const darkAnalysis = await inspectScreenDOM(cdp);

            results.push({
                screen: screen.name,
                path: screen.path,
                lightScreenshot: lightFilename,
                darkScreenshot: darkFilename,
                lightAnalysis,
                darkAnalysis
            });

            console.log(`✓ Completed ${screen.name}`);
        } catch (err) {
            console.error(`✗ Error auditing ${screen.name}:`, err.message || err);
            results.push({
                screen: screen.name,
                path: screen.path,
                error: err.message || String(err)
            });
        }
    }

    cdp.close();

    fs.writeFileSync('scripts/forensic_audit_results.json', JSON.stringify(results, null, 2));
    console.log('\n--- Forensic Audit Data Collection Complete ---');
    console.log(`Results saved to scripts/forensic_audit_results.json with ${results.length} screens.`);
}

runAudit().catch(console.error);
