import { evalInPage } from './cdp_helper.mjs';

async function main() {
    console.log('Inspecting Chat UI on Emulator 5558 (Alex Davis)...');
    const u1Chat = await evalInPage(`(() => {
        const convs = Array.from(document.querySelectorAll('.conversation-item, .chat-list-item, .conv-card')).map(c => ({
            text: c.innerText.replace(/\\n+/g, ' | ').trim(),
            classes: c.className
        }));
        const headerCoin = document.querySelector('.chat-coin-pill, .coin-balance-pill, .header-coins')?.innerText;
        const callBtn = !!document.querySelector('.btn-call');
        const menuBtn = !!document.querySelector('.btn-chat-menu, .chat-menu-btn');
        return {
            url: window.location.href,
            conversationsCount: convs.length,
            convs,
            headerCoin,
            callBtn,
            menuBtn
        };
    })()`, '9224');
    console.log('5558 Chat State:', JSON.stringify(u1Chat, null, 2));

    console.log('\nInspecting Chat UI on Emulator 5556 (Jordan Taylor)...');
    const u2Chat = await evalInPage(`(() => {
        const convs = Array.from(document.querySelectorAll('.conversation-item, .chat-list-item, .conv-card')).map(c => ({
            text: c.innerText.replace(/\\n+/g, ' | ').trim(),
            classes: c.className
        }));
        const headerCoin = document.querySelector('.chat-coin-pill, .coin-balance-pill, .header-coins')?.innerText;
        return {
            url: window.location.href,
            conversationsCount: convs.length,
            convs,
            headerCoin
        };
    })()`, '9223');
    console.log('5556 Chat State:', JSON.stringify(u2Chat, null, 2));
}

main().catch(console.error);
