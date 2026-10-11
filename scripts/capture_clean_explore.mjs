import { evaluateInWebview } from './webview_client.mjs';
import { execSync } from 'child_process';
import path from 'path';

const SNAP_SCRIPT = path.resolve('scripts/snap.mjs');
function snap(name) {
    execSync(`node "${SNAP_SCRIPT}" "${name}"`, { stdio: 'inherit' });
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    console.log('1. Reloading webview to pick up copied assets...');
    await evaluateInWebview(`window.location.reload()`);
    await sleep(4000);

    console.log('2. Clicking Explore tab in bottom nav...');
    await evaluateInWebview(`(() => {
        const exploreLink = document.querySelector('a[href="/explore"], a[aria-label="Explore"]');
        if (exploreLink) exploreLink.click();
    })()`);
    await sleep(2500);

    console.log('3. Capturing evidence_41_explore_clean_search.png...');
    snap('evidence_41_explore_clean_search.png');
    console.log('DONE!');
}

main().catch(console.error);
