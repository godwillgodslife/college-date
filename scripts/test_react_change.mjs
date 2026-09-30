import { evalInPage } from './cdp_helper.mjs';

async function main() {
    const res = await evalInPage(`(() => {
        const input = document.getElementById('chat-message-input');
        if (!input) return 'no input';
        
        const setVal = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        setVal.call(input, "Real-time message send test!");
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Find send button
        const btn = document.querySelector('.chat-send-btn');
        if (btn) {
            btn.click();
            return 'clicked send button';
        }
        return 'no send btn';
    })()`, '9222');
    console.log('Result:', res);
}

main().catch(console.error);
