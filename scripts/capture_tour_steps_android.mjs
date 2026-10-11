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
    const client = await getCdpConnection();

    // 1. Open the modal
    console.log('Opening Campus Tour Demo...');
    const openRes = await client.evaluate(`
        (() => {
            const btn = document.querySelector('button.btn-demo');
            if (btn) {
                btn.click();
                return 'Clicked Tour Campus Demo';
            }
            return 'btn-demo not found';
        })()
    `);
    console.log(openRes.result?.value);
    await new Promise(r => setTimeout(r, 600));
    snap('android_campus_demo_tab1_profile.png');

    // 2. Click Like
    console.log('Clicking Like on Amaka...');
    const likeRes = await client.evaluate(`
        (() => {
            const btn = document.querySelector('.btn-like');
            if (btn) {
                btn.click();
                return 'Clicked Like button';
            }
            return 'btn-like not found';
        })()
    `);
    console.log(likeRes.result?.value);
    await new Promise(r => setTimeout(r, 600));
    snap('android_campus_demo_tab1_celebration.png');

    // 3. Switch to Secrets Tab
    console.log('Switching to Campus Secrets tab...');
    const secretsTabRes = await client.evaluate(`
        (() => {
            const tabs = Array.from(document.querySelectorAll('.guest-tab-btn'));
            const tab = tabs.find(t => t.innerText.includes('Secrets'));
            if (tab) {
                tab.click();
                return 'Switched to Secrets tab';
            }
            return 'Secrets tab not found';
        })()
    `);
    console.log(secretsTabRes.result?.value);
    await new Promise(r => setTimeout(r, 600));
    snap('android_campus_demo_tab2_secrets.png');

    // 4. Switch to Icebreakers Tab
    console.log('Switching to 1-Tap Icebreakers tab...');
    const chatTabRes = await client.evaluate(`
        (() => {
            const tabs = Array.from(document.querySelectorAll('.guest-tab-btn'));
            const tab = tabs.find(t => t.innerText.includes('Icebreaker'));
            if (tab) {
                tab.click();
                return 'Switched to Icebreakers tab';
            }
            return 'Icebreakers tab not found';
        })()
    `);
    console.log(chatTabRes.result?.value);
    await new Promise(r => setTimeout(r, 600));
    snap('android_campus_demo_tab3_chat.png');

    // 5. Click an icebreaker chip to send message and get simulated reply
    console.log('Clicking an icebreaker chip...');
    const chipRes = await client.evaluate(`
        (() => {
            const chip = document.querySelector('.demo-icebreaker-pill');
            if (chip) {
                const text = chip.innerText;
                chip.click();
                return 'Clicked icebreaker chip: ' + text;
            }
            return 'No icebreaker chip found';
        })()
    `);
    console.log(chipRes.result?.value);
    await new Promise(r => setTimeout(r, 1000));
    snap('android_campus_demo_tab3_replied.png');

    client.close();
    console.log('All 5 screenshots captured successfully on native Android emulator!');
}

run().catch(console.error);
