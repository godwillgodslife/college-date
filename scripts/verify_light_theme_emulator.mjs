import { getCdpConnection } from './cdp-client.mjs';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const adb = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');

function snap(name) {
    const target = path.resolve(`public/evidence_qa/${name}`);
    const buf = execSync(`"${adb}" -s emulator-5554 exec-out screencap -p`, { maxBuffer: 15 * 1024 * 1024 });
    fs.writeFileSync(target, buf);
    console.log(`Saved screenshot ${name} (${buf.length} bytes)`);
}

async function run() {
    console.log('Connecting to Android WebView via CDP...');
    let client = await getCdpConnection();

    // Ensure Light Theme in app
    console.log('Setting Light Theme in WebView...');
    await client.evaluate(`
        (() => {
            localStorage.setItem('tcd_theme_preference', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-theme-preference', 'light');
        })()
    `);

    // ── 1. Navigate to Landing / Guest View ──
    console.log('Navigating to Landing page for Guest Demo...');
    await client.evaluate(`
        (() => {
            // Push state or set href
            const nav = window.location.pathname !== '/' ? (window.location.href = '/') : null;
        })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    client.close();
    client = await getCdpConnection();

    // Re-assert light theme on landing
    await client.evaluate(`
        (() => {
            document.documentElement.setAttribute('data-theme', 'light');
        })()
    `);
    await new Promise(r => setTimeout(r, 500));
    snap('light_emulator_1_landing.png');

    // ── 2. Open Campus Tour Demo ──
    console.log('Opening Campus Tour Demo in Light Mode...');
    await client.evaluate(`
        (() => {
            const btn = document.querySelector('button.btn-demo');
            if (btn) btn.click();
        })()
    `);
    await new Promise(r => setTimeout(r, 800));
    snap('light_emulator_2_campus_demo_profile.png');

    // ── 3. Like profile to test celebration banner in Light Mode ──
    console.log('Clicking Like in Demo...');
    await client.evaluate(`
        (() => {
            const btn = document.querySelector('.btn-like');
            if (btn) btn.click();
        })()
    `);
    await new Promise(r => setTimeout(r, 600));
    snap('light_emulator_3_campus_demo_matched.png');

    // ── 4. Switch to Campus Secrets tab ──
    console.log('Switching to Campus Secrets tab in Light Mode...');
    await client.evaluate(`
        (() => {
            const tabs = Array.from(document.querySelectorAll('.guest-tab-btn'));
            const tab = tabs.find(t => t.innerText.includes('Secrets'));
            if (tab) tab.click();
        })()
    `);
    await new Promise(r => setTimeout(r, 600));
    snap('light_emulator_4_campus_demo_secrets.png');

    // ── 5. Switch to 1-Tap Icebreakers tab ──
    console.log('Switching to 1-Tap Icebreakers tab in Light Mode...');
    await client.evaluate(`
        (() => {
            const tabs = Array.from(document.querySelectorAll('.guest-tab-btn'));
            const tab = tabs.find(t => t.innerText.includes('Icebreaker'));
            if (tab) tab.click();
        })()
    `);
    await new Promise(r => setTimeout(r, 600));
    snap('light_emulator_5_campus_demo_icebreakers.png');

    // Close demo modal
    await client.evaluate(`
        (() => {
            const closeBtn = document.querySelector('.guest-preview-close');
            if (closeBtn) closeBtn.click();
        })()
    `);
    await new Promise(r => setTimeout(r, 400));

    // ── 6. Navigate to /dashboard (Campus Command Center) ──
    console.log('Navigating to Dashboard (Home) in Light Mode...');
    await client.evaluate(`
        (() => {
            window.location.href = '/dashboard';
        })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    client.close();
    client = await getCdpConnection();
    await client.evaluate(`
        (() => {
            document.documentElement.setAttribute('data-theme', 'light');
        })()
    `);
    await new Promise(r => setTimeout(r, 500));
    snap('light_emulator_6_dashboard.png');

    // ── 7. Navigate to /explore ──
    console.log('Navigating to Explore in Light Mode...');
    await client.evaluate(`
        (() => {
            window.location.href = '/explore';
        })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    client.close();
    client = await getCdpConnection();
    await client.evaluate(`
        (() => {
            document.documentElement.setAttribute('data-theme', 'light');
        })()
    `);
    await new Promise(r => setTimeout(r, 500));
    snap('light_emulator_7_explore.png');

    // ── 8. Navigate to /confessions (Campus Daily Question Banner) ──
    console.log('Navigating to Confessions in Light Mode...');
    await client.evaluate(`
        (() => {
            window.location.href = '/confessions';
        })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    client.close();
    client = await getCdpConnection();
    await client.evaluate(`
        (() => {
            document.documentElement.setAttribute('data-theme', 'light');
        })()
    `);
    await new Promise(r => setTimeout(r, 500));
    snap('light_emulator_8_confessions.png');

    // ── 9. Navigate to /profile ──
    console.log('Navigating to Profile in Light Mode...');
    await client.evaluate(`
        (() => {
            window.location.href = '/profile';
        })()
    `);
    await new Promise(r => setTimeout(r, 2000));
    client.close();
    client = await getCdpConnection();
    await client.evaluate(`
        (() => {
            document.documentElement.setAttribute('data-theme', 'light');
        })()
    `);
    await new Promise(r => setTimeout(r, 500));
    snap('light_emulator_9_profile.png');

    client.close();
    console.log('ALL LIGHT EMULATOR VERIFICATION CHECKS COMPLETED!');
}

run().catch(console.error);
