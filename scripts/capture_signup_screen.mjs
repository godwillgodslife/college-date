// scripts/capture_signup_screen.mjs
import { evalInPage } from './cdp_helper.mjs';

async function main() {
    console.log('Navigating to /settings...');
    await evalInPage(`window.location.href = '/settings'`, '9222');
    await new Promise(r => setTimeout(r, 1500));

    console.log('Clicking logout button...');
    const logoutResult = await evalInPage(`(() => {
        const btn = document.querySelector('.settings-action-btn.logout');
        if (btn) {
            btn.click();
            return 'logout-clicked';
        }
        return 'logout-btn-not-found';
    })()`, '9222');
    console.log('Logout result:', logoutResult);

    await new Promise(r => setTimeout(r, 2000));
    console.log('Current path:', await evalInPage('location.pathname', '9222'));

    console.log('Navigating to /signup...');
    await evalInPage(`(() => {
        const link = document.querySelector('a[href="/signup"], a[href$="/signup"], .auth-link');
        if (link) {
            link.click();
            return 'signup-link-clicked';
        }
        window.location.href = '/signup';
        return 'fallback-href-set';
    })()`, '9222');

    await new Promise(r => setTimeout(r, 2000));
    console.log('Current path after signup nav:', await evalInPage('location.pathname', '9222'));
}

main().catch(console.error);
