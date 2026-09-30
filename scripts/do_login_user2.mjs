import { evalInPage } from './cdp_helper.mjs';

async function main() {
    console.log('Navigating 9224 to /login...');
    await evalInPage(`window.location.href = '/login'`, '9224').catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    console.log('Filling login form on 9224...');
    const res = await evalInPage(`(async () => {
        const emailInput = document.querySelector('#email');
        const passInput = document.querySelector('#password');
        const submitBtn = document.querySelector('button[type="submit"]');

        if (!emailInput || !passInput || !submitBtn) {
            return { error: 'Inputs not found', email: !!emailInput, pass: !!passInput, btn: !!submitBtn, url: window.location.href };
        }

        const setValue = (el, value) => {
            const proto = Object.getPrototypeOf(el);
            const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
            setter.call(el, value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        };

        setValue(emailInput, 'student.tester2026.partner@gmail.com');
        setValue(passInput, 'CollegeDate2026!VerifiedPass');

        await new Promise(r => setTimeout(r, 300));
        submitBtn.click();
        return { success: true, submitted: true };
    })()`, '9224');

    console.log('Form submission result:', res);
    await new Promise(r => setTimeout(r, 4000));

    const check = await evalInPage(`(() => {
        const auth = JSON.parse(localStorage.getItem("sb-gedoyoleoscgxgdqszzc-auth-token") || "{}");
        return { url: window.location.href, email: auth.user?.email, id: auth.user?.id };
    })()`, '9224');
    console.log('Port 9224 state after login:', check);
}

main().catch(console.error);
