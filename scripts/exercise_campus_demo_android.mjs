import { getCdpConnection } from './cdp-client.mjs';
import { execSync } from 'child_process';
import path from 'path';

const adb = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');

function snap(name) {
    const target = path.resolve(`public/evidence_qa/${name}`);
    const buf = execSync(`"${adb}" -s emulator-5554 exec-out screencap -p`);
    import('fs').then(fs => fs.writeFileSync(target, buf));
    console.log(`Captured ${name} (${buf.length} bytes)`);
}

async function run() {
    const client = await getCdpConnection();
    
    // 1. Inspect DOM state
    const info = await client.evaluate(`
        (() => {
            const btns = Array.from(document.querySelectorAll('button')).map(b => ({
                class: b.className,
                text: b.innerText.slice(0, 30),
                aria: b.getAttribute('aria-label')
            }));
            const modal = !!document.querySelector('.guest-preview-modal');
            return { modal, btns };
        })()
    `);
    console.log('DOM Info:', JSON.stringify(info.result?.value, null, 2));

    // 2. Click like button
    console.log('Clicking Like...');
    const likeRes = await client.evaluate(`
        (() => {
            const btn = document.querySelector('.btn-like') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('❤️'));
            if (btn) {
                btn.click();
                return 'Clicked Like';
            }
            return 'Like button not found';
        })()
    `);
    console.log('Like result:', likeRes.result?.value);
    
    // Wait 400ms for match celebration banner
    await new Promise(r => setTimeout(r, 600));
    snap('android_campus_demo_matched.png');

    // 3. Switch to Secrets Tab
    console.log('Switching to Campus Secrets tab...');
    const secretsRes = await client.evaluate(`
        (() => {
            const tab = Array.from(document.querySelectorAll('.guest-tab-btn')).find(b => b.innerText.includes('Secrets') || b.innerText.includes('Confessions'));
            if (tab) {
                tab.click();
                return 'Clicked Secrets Tab';
            }
            return 'Secrets tab not found';
        })()
    `);
    console.log('Secrets tab result:', secretsRes.result?.value);
    await new Promise(r => setTimeout(r, 500));
    snap('android_campus_demo_secrets.png');

    // 4. Switch to 1-Tap Icebreakers Tab
    console.log('Switching to Icebreakers tab...');
    const icebreakersRes = await client.evaluate(`
        (() => {
            const tab = Array.from(document.querySelectorAll('.guest-tab-btn')).find(b => b.innerText.includes('Icebreaker'));
            if (tab) {
                tab.click();
                return 'Clicked Icebreakers Tab';
            }
            return 'Icebreakers tab not found';
        })()
    `);
    console.log('Icebreakers tab result:', icebreakersRes.result?.value);
    await new Promise(r => setTimeout(r, 500));
    snap('android_campus_demo_icebreakers.png');

    // 5. Click an icebreaker chip
    console.log('Clicking Icebreaker chip...');
    const chipRes = await client.evaluate(`
        (() => {
            const chip = document.querySelector('.demo-icebreaker-pill');
            if (chip) {
                chip.click();
                return 'Clicked Chip: ' + chip.innerText;
            }
            return 'Chip not found';
        })()
    `);
    console.log('Chip result:', chipRes.result?.value);
    await new Promise(r => setTimeout(r, 1000));
    snap('android_campus_demo_chat_replied.png');

    client.close();
    console.log('Verification exercise complete!');
}

run().catch(console.error);
