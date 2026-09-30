import { evalInPage } from './cdp_helper.mjs';

const port = process.argv[2] || '9223';
const email = process.argv[3] || 'student.tester2026@gmail.com';
const password = process.argv[4] || 'CollegeDate2026!VerifiedPass';

async function login() {
    console.log(`Logging in ${email} on port ${port}...`);
    await evalInPage("window.location.href = '/login'", port).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

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

        setValue(emailInput, '${email}');
        setValue(passInput, '${password}');

        await new Promise(r => setTimeout(r, 300));
        submitBtn.click();
        return { success: true };
    })()`, port);

    console.log(`Login submit result on ${port}:`, res);
    await new Promise(r => setTimeout(r, 4000));

    const check = await evalInPage(`(() => {
        const auth = JSON.parse(localStorage.getItem('sb-gedoyoleoscgxgdqszzc-auth-token') || '{}');
        return { url: window.location.href, email: auth.user?.email, id: auth.user?.id };
    })()`, port);
    console.log(`${port} state:`, check);
}

login().catch(console.error);
