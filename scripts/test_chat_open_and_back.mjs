import { evalInPage } from './cdp_helper.mjs';

async function run() {
    process.env.CDP_PORT = '9222';
    console.log('Navigating to /chat...');
    await evalInPage(`window.location.hash = ''; window.history.pushState({}, '', '/chat'); window.dispatchEvent(new PopStateEvent('popstate'));`);
    await new Promise(r => setTimeout(r, 2000));

    const state = await evalInPage(`(() => {
        const convCards = document.querySelectorAll('.conversation-item, .recent-chat-card, .new-match-avatar-card');
        return {
            url: window.location.href,
            convCount: convCards.length,
            title: document.title,
            bodyText: document.body.innerText.substring(0, 300)
        };
    })()`);
    console.log('Chat page state:', state);

    if (state.convCount > 0) {
        console.log('Clicking first conversation...');
        await evalInPage(`(() => {
            const card = document.querySelector('.conversation-item, .recent-chat-card, .new-match-avatar-card');
            if (card) card.click();
        })()`);
        await new Promise(r => setTimeout(r, 1500));

        const inChatState = await evalInPage(`(() => {
            return {
                url: window.location.href,
                hasChatHeader: !!document.querySelector('.chat-header'),
                hasBackBtn: !!document.querySelector('.back-btn'),
                chatName: document.querySelector('.header-name')?.innerText,
                msgCount: document.querySelectorAll('.message-item').length
            };
        })()`);
        console.log('In chat state:', inChatState);

        console.log('Testing back button...');
        await evalInPage(`(() => {
            const backBtn = document.querySelector('.back-btn');
            if (backBtn) backBtn.click();
        })()`);
        await new Promise(r => setTimeout(r, 1500));

        const afterBackState = await evalInPage(`(() => {
            return {
                url: window.location.href,
                hasChatHeader: !!document.querySelector('.chat-header'),
                hasError: document.body.innerText.includes('Something went wrong'),
                lastError: sessionStorage.getItem('tcd_last_error')
            };
        })()`);
        console.log('After back state:', afterBackState);
    }
}

run().catch(console.error);
