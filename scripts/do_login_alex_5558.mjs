import { evalInPage } from './cdp_helper.mjs';

async function login() {
    console.log('Navigating 9222 to /login...');
    await evalInPage("window.location.href = '/login'", '9222').catch(() => {});
    await new Promise(r => setTimeout(r, 3000));

    console.log('Filling login form on 9222...');
    const res = await evalInPage(`(async () => {
        const emailInput = document.querySelector('#email');
        const passInput = document.querySelector('#password');
        const submitBtn = document.querySelector('button[type="submit"]');

        if (!emailInput || !passInput || !submitBtn) {
            return { error: 'Inputs not found', url: window.location.href };
        }

        const setValue = (el, value) => {
            const proto = Object.getPrototypeOf(el);
            const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
            setter.call(el, value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        };

        setValue(emailInput, 'student.tester2026@gmail.com');
        setValue(passInput, 'CollegeDate2026!VerifiedPass');

        await new Promise(r => setTimeout(r, 300));
        submitBtn.click();
        return { success: true };
    })()`, '9222');

    console.log('Login result on 9222:', res);
    await new Promise(r => setTimeout(r, 5000));

    const check = await evalInPage(`(() => {
        const auth = JSON.parse(localStorage.getItem('sb-gedoyoleoscgxgdqszzc-auth-token') || '{}');
        return { url: window.location.href, email: auth.user?.email, id: auth.user?.id };
    })()`, '9222');
    console.log('9222 state:', check);
}

login().catch(console.error);
