import { evalInPage } from './cdp_helper.mjs';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

async function getSession(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body: JSON.stringify({ email, password })
    });
    return await res.json();
}

async function setSession(port, session, targetPath = '/chat') {
    const sessionStr = JSON.stringify(session);
    console.log(`Setting session for ${session.user.email} on port ${port}...`);
    await evalInPage(`(() => {
        localStorage.setItem("sb-gedoyoleoscgxgdqszzc-auth-token", ${JSON.stringify(sessionStr)});
        window.location.href = '${targetPath}';
    })()`, port).catch(() => {});
}

async function main() {
    const u1 = await getSession('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    const u2 = await getSession('student.tester2026.partner@gmail.com', 'CollegeDate2026!VerifiedPass');

    // 9223 (Pixel 4a) -> User 1 (Alex Davis)
    await setSession('9223', u1, '/chat');
    // 9224 (Pixel 2) -> User 2 (Jordan Taylor)
    await setSession('9224', u2, '/chat');

    await new Promise(r => setTimeout(r, 4000));

    const check1 = await evalInPage(`JSON.parse(localStorage.getItem("sb-gedoyoleoscgxgdqszzc-auth-token") || "{}").user?.email`, '9223').catch(e => e.message);
    const check2 = await evalInPage(`JSON.parse(localStorage.getItem("sb-gedoyoleoscgxgdqszzc-auth-token") || "{}").user?.email`, '9224').catch(e => e.message);

    console.log('Emulator 5556 (9223) User:', check1);
    console.log('Emulator 5558 (9224) User:', check2);
}

main().catch(console.error);
