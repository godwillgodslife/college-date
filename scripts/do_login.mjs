import { evalInPage } from './cdp_helper.mjs';
import { execSync } from 'child_process';

const ADB = `"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554`;

async function run() {
    process.env.CDP_PORT = '9222';
    const unixOut = execSync(`${ADB} shell cat /proc/net/unix`).toString();
    const match = unixOut.match(/@(webview_devtools_remote_\d+)/);
    if (match) {
        execSync(`${ADB} forward tcp:9222 localabstract:${match[1]}`);
    }

    console.log('Filling password and clicking Sign In...');
    const result = await evalInPage(`(() => {
        const pass = document.querySelector('input[type="password"]');
        if (!pass) return 'No password input found';
        
        // Native setter to ensure React state updates
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(pass, 'CollegeDate2026!VerifiedPass');
        pass.dispatchEvent(new Event('input', { bubbles: true }));
        pass.dispatchEvent(new Event('change', { bubbles: true }));

        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign In'));
        if (btn) {
            btn.click();
            return 'Sign In Clicked';
        }
        return 'No button';
    })()`);

    console.log('Result:', result);
}

run().catch(console.error);
