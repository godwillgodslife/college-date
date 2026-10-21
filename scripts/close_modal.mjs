import { connectEmulatorWebview } from './emulator-qa-controller.mjs';

async function main() {
    const c = await connectEmulatorWebview();
    const clicked = await c.evaluate(`
        (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const cancelBtn = btns.find(b => b.innerText.trim().toLowerCase() === 'cancel' || b.getAttribute('aria-label') === 'Close');
            if (cancelBtn) {
                cancelBtn.click();
                return 'Cancel button clicked!';
            }
            const closeX = document.querySelector('.status-close-btn, .modal-close-btn, .close-btn');
            if (closeX) {
                closeX.click();
                return 'Close X clicked!';
            }
            return 'Button not found';
        })()
    `);
    console.log('Result:', clicked);
    await new Promise(r => setTimeout(r, 600));
    c.close();
}

main().catch(console.error);
