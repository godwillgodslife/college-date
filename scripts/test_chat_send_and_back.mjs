import { evalInPage } from './cdp_helper.mjs';

async function run() {
    process.env.CDP_PORT = '9222';
    console.log('Opening first conversation...');
    await evalInPage(`(() => {
        const card = document.querySelector('.conversation-item, .recent-chat-card, .new-match-avatar-card');
        if (card) card.click();
    })()`);
    await new Promise(r => setTimeout(r, 1500));

    console.log('Typing message...');
    await evalInPage(`(() => {
        const input = document.querySelector('input.chat-input') || document.querySelector('input[type=text]');
        if (!input) return 'no input';
        input.focus();
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, 'Hello from emulator verification test!');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return 'typed';
    })()`);
    await new Promise(r => setTimeout(r, 500));

    console.log('Sending message...');
    await evalInPage(`(() => {
        const sendBtn = document.querySelector('.btn-send, button[aria-label*=\"Send\"], .chat-send-btn');
        if (sendBtn) sendBtn.click();
        return !!sendBtn;
    })()`);
    await new Promise(r => setTimeout(r, 1500));

    const chatState = await evalInPage(`(() => {
        return {
            hasError: document.body.innerText.includes('Something went wrong'),
            lastError: sessionStorage.getItem('tcd_last_error'),
            textSnippet: document.body.innerText.substring(0, 200)
        };
    })()`);
    console.log('Chat after sending:', chatState);

    console.log('Tapping back button...');
    await evalInPage(`(() => {
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) backBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1500));

    const finalState = await evalInPage(`(() => {
        return {
            url: window.location.href,
            hasError: document.body.innerText.includes('Something went wrong'),
            lastError: sessionStorage.getItem('tcd_last_error')
        };
    })()`);
    console.log('Final state after sending & going back:', finalState);
}

run().catch(console.error);
