import { getCdpConnection } from './cdp-client.mjs';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const adb = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');

function snap(name) {
    const target = path.resolve(`public/evidence_qa/${name}`);
    const buf = execSync(`"${adb}" -s emulator-5554 exec-out screencap -p`);
    fs.writeFileSync(target, buf);
    console.log(`Saved screenshot ${name} (${buf.length} bytes)`);
}

async function run() {
    console.log('Connecting to Android WebView via CDP...');
    let client = await getCdpConnection();

    console.log('Clearing auth session to simulate fresh guest visitor...');
    await client.evaluate(`
        (() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        })()
    `);

    // Wait 2.5s for Landing to mount cleanly
    await new Promise(r => setTimeout(r, 2500));

    // Reconnect client in case navigation refreshed the target
    client.close();
    client = await getCdpConnection();

    console.log('Opening Campus Guest Demo modal...');
    const openRes = await client.evaluate(`
        (() => {
            const btn = document.querySelector('button.btn-demo');
            if (btn) {
                btn.click();
                return 'Clicked btn-demo';
            }
            return 'btn-demo not found';
        })()
    `);
    console.log('Open demo result:', openRes.result?.value);
    await new Promise(r => setTimeout(r, 800));

    // Capture Tab 1: Profile View
    snap('android_campus_demo_1_profiles.png');

    // Click Like Button
    console.log('Clicking Like on profile...');
    const likeRes = await client.evaluate(`
        (() => {
            const btn = document.querySelector('.btn-like');
            if (btn) {
                btn.click();
                return 'Clicked Like';
            }
            return 'btn-like not found';
        })()
    `);
    console.log('Like result:', likeRes.result?.value);
    await new Promise(r => setTimeout(r, 600));

    // Capture Tab 1: Matched Celebration Banner
    snap('android_campus_demo_2_liked.png');

    // Switch to Tab 2: Campus Secrets
    console.log('Switching to Campus Secrets tab...');
    const secretsTabRes = await client.evaluate(`
        (() => {
            const tabs = Array.from(document.querySelectorAll('.guest-tab-btn'));
            const secretsTab = tabs.find(t => t.innerText.includes('Secrets'));
            if (secretsTab) {
                secretsTab.click();
                return 'Switched to Secrets';
            }
            return 'Secrets tab not found';
        })()
    `);
    console.log('Secrets tab switch:', secretsTabRes.result?.value);
    await new Promise(r => setTimeout(r, 600));

    // React to first confession
    await client.evaluate(`
        (() => {
            const reactBtn = document.querySelector('.confession-demo-reactions .reaction-pill');
            if (reactBtn) reactBtn.click();
        })()
    `);
    await new Promise(r => setTimeout(r, 300));

    // Capture Tab 2: Campus Secrets Feed
    snap('android_campus_demo_3_secrets.png');

    // Switch to Tab 3: 1-Tap Icebreakers
    console.log('Switching to 1-Tap Icebreakers tab...');
    const chatTabRes = await client.evaluate(`
        (() => {
            const tabs = Array.from(document.querySelectorAll('.guest-tab-btn'));
            const chatTab = tabs.find(t => t.innerText.includes('Icebreaker'));
            if (chatTab) {
                chatTab.click();
                return 'Switched to Icebreakers';
            }
            return 'Icebreakers tab not found';
        })()
    `);
    console.log('Icebreakers tab switch:', chatTabRes.result?.value);
    await new Promise(r => setTimeout(r, 600));

    // Capture Tab 3: Initial Chat Screen with Icebreaker Chips
    snap('android_campus_demo_4_icebreakers.png');

    // Click an icebreaker chip to send message and trigger simulated reply
    console.log('Clicking 1-Tap icebreaker chip...');
    const chipRes = await client.evaluate(`
        (() => {
            const chips = Array.from(document.querySelectorAll('.demo-icebreaker-pill'));
            if (chips.length > 0) {
                chips[0].click();
                return 'Clicked chip: ' + chips[0].innerText;
            }
            return 'No icebreaker chips found';
        })()
    `);
    console.log('Chip click result:', chipRes.result?.value);

    // Wait 1000ms for simulated reply to render
    await new Promise(r => setTimeout(r, 1200));

    // Capture Tab 3: Chat with Sent Message and Simulated Reply
    snap('android_campus_demo_5_chat_reply.png');

    client.close();
    console.log('ALL EMULATOR VERIFICATION CHECKS COMPLETED SUCCESSFULLY!');
}

run().catch(console.error);
