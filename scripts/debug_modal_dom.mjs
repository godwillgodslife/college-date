import { evalInPage } from './cdp_helper.mjs';

async function debug() {
    process.env.CDP_PORT = '9222';
    const res = await evalInPage(`(() => {
        const item = document.querySelector('.conversation-item');
        if (item) item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
        const overlay = document.querySelector('.chat-action-overlay');
        const sheet = document.querySelector('.chat-action-sheet');
        if (!sheet) return { err: 'no sheet' };
        const rect = sheet.getBoundingClientRect();
        const oRect = overlay.getBoundingClientRect();
        const cs = window.getComputedStyle(sheet);
        const ocs = window.getComputedStyle(overlay);
        return {
            sheetRect: { top: rect.top, bottom: rect.bottom, height: rect.height, width: rect.width },
            overlayRect: { top: oRect.top, bottom: oRect.bottom, height: oRect.height },
            sheetTransform: cs.transform,
            sheetDisplay: cs.display,
            sheetZIndex: cs.zIndex,
            overlayZIndex: ocs.zIndex,
            overlayBg: ocs.backgroundColor,
            windowHeight: window.innerHeight,
            windowWidth: window.innerWidth,
            parentTagName: sheet.parentElement.tagName,
            parentClass: sheet.parentElement.className
        };
    })()`);
    console.log(JSON.stringify(res, null, 2));
}

debug().catch(console.error);
