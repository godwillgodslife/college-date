import { execSync } from 'child_process';
import path from 'path';

const ADB = `"${path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe')}" -s emulator-5554`;

async function main() {
    // 1. Focus input
    execSync(`node -e "import('./scripts/webview_client.mjs').then(({evaluateInWebview}) => evaluateInWebview('document.querySelector(\\\".explore-search-input\\\").focus()'))"`);
    
    // 2. Select all and delete
    execSync(`${ADB} shell input keyevent 29 --meta 113`); // Ctrl+A
    execSync(`${ADB} shell input keyevent 67`); // Backspace
    
    // 3. Type "Queen"
    execSync(`${ADB} shell input text Queen`);
    
    // 4. Press Enter (Search key)
    execSync(`${ADB} shell input keyevent 66`);

    await new Promise(r => setTimeout(r, 3000));

    // 5. Check what is on screen
    const res = execSync(`node -e "import('./scripts/webview_client.mjs').then(({evaluateInWebview}) => evaluateInWebview('(() => ({ val: document.querySelector(\\\".explore-search-input\\\").value, cards: Array.from(document.querySelectorAll(\\\".explore-card\\\")).map(c => c.innerText), empty: document.querySelector(\\\".empty-discovery\\\")?.innerText, feedback: document.querySelector(\\\".search-results-feedback\\\")?.innerText }))()'))"`).toString();
    console.log('Result from real Android input typing:', res);
}

main().catch(console.error);
