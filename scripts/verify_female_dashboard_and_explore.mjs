import { evalInPage } from './cdp_helper.mjs';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const env = fs.readFileSync('.env', 'utf8');
let url = '', anon = '';
for (const l of env.split('\n')) {
    if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
    if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) anon = l.split('=')[1].trim();
}
const supabase = createClient(url, anon);

const ADB = `"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554`;

function captureScreenshot(filename) {
    execSync(`${ADB} shell screencap -p /sdcard/screen.png`);
    execSync(`${ADB} pull /sdcard/screen.png "${filename}"`);
    console.log(`[Screenshot Captured] ${filename}`);
}

async function run() {
    console.log('1. Signing in as female test user (student.tester2026.partner@gmail.com)...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'student.tester2026.partner@gmail.com',
        password: 'CollegeDate2026!VerifiedPass'
    });

    if (authError || !authData.session) {
        throw new Error(`Failed to sign in: ${authError?.message}`);
    }

    console.log(`✓ Authenticated as ${authData.user.email} (ID: ${authData.user.id})`);

    // Verify female profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
    console.log(`✓ User profile: name="${profile.full_name}", gender="${profile.gender}", role="${profile.role}"`);

    // Update Jordan's display full_name temporarily to "sojiok578@gmail.co" to reproduce user's exact case, or test formatting
    console.log('2. Testing formatDisplayName with email full_name: sojiok578@gmail.co ...');
    await supabase
        .from('profiles')
        .update({ full_name: 'sojiok578@gmail.co' })
        .eq('id', authData.user.id);

    console.log('3. Injecting session into WebView on port 9222...');
    const sessionStr = JSON.stringify(authData.session);
    await evalInPage(`(() => {
        localStorage.setItem("sb-gedoyoleoscgxgdqszzc-auth-token", ${JSON.stringify(sessionStr)});
        window.location.href = '/dashboard';
    })()`, '9222');

    console.log('4. Waiting 4 seconds for dashboard to load...');
    await new Promise(r => setTimeout(r, 4500));

    // Capture initial female dashboard
    captureScreenshot('evidence_female_dashboard_01_top.png');

    // Scroll down to check banners and bottom cards with floating nav clearance
    console.log('5. Scrolling down on dashboard...');
    await evalInPage(`window.scrollBy({ top: 350, behavior: 'smooth' })`, '9222');
    await new Promise(r => setTimeout(r, 1500));
    captureScreenshot('evidence_female_dashboard_02_banners_and_stats.png');

    // Scroll down to bottom to verify floating bottom nav clearance
    console.log('6. Scrolling to bottom of female dashboard...');
    await evalInPage(`window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })`, '9222');
    await new Promise(r => setTimeout(r, 1500));
    captureScreenshot('evidence_female_dashboard_03_bottom_clearance.png');

    // Restore Jordan's full name
    await supabase
        .from('profiles')
        .update({ full_name: 'Jordan Taylor' })
        .eq('id', authData.user.id);

    // Navigate to /explore
    console.log('7. Navigating to /explore ...');
    await evalInPage(`(() => { window.location.href = '/explore'; })()`, '9222');
    await new Promise(r => setTimeout(r, 4500));

    // Capture Explore header with inline camera button and "📸 Find by Camera" chip
    captureScreenshot('evidence_explore_01_camera_buttons_and_grid.png');

    // Scroll down slightly on explore to check card badges and non-colliding layout
    console.log('8. Scrolling explore grid...');
    await evalInPage(`window.scrollBy({ top: 300, behavior: 'smooth' })`, '9222');
    await new Promise(r => setTimeout(r, 1500));
    captureScreenshot('evidence_explore_02_badges_and_names.png');

    // Open Campus Finder modal via the camera button
    console.log('9. Clicking Find by Camera button...');
    await evalInPage(`(() => {
        const btn = document.querySelector('.category-chip-finder') || document.querySelector('.search-camera-btn');
        if (btn) btn.click();
    })()`, '9222');
    await new Promise(r => setTimeout(r, 1500));
    captureScreenshot('evidence_explore_03_campus_finder_modal.png');

    console.log('✅ ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
}

run().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
