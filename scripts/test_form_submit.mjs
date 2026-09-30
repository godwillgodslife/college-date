import { evalInPage } from './cdp_helper.mjs';

async function main() {
    const res = await evalInPage(`(() => {
        const form = document.querySelector('form.chat-input-form') || document.querySelector('form');
        const input = document.getElementById('chat-message-input');
        if (!input) return { error: 'no input' };
        
        const setVal = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        setVal.call(input, "Fresh message via form submit! 🚀");
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
        if (form) {
            form.requestSubmit();
            return { formSubmitted: true, value: input.value };
        }
        return { error: 'no form' };
    })()`, '9222');
    console.log('Result:', res);
}

main().catch(console.error);
