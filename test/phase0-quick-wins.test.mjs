import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    getCampusCommonGround,
    getCampusIcebreakers,
    formatStudentLevel,
    formatDepartmentName
} from '../src/utils/campusCommonGround.js';

const projectRoot = process.cwd();

test('Phase 0 & 1 Quick Wins: 1. Mobile Bottom Navigation & Top App Bar Fix', () => {
    const bottomNavJsx = fs.readFileSync(path.join(projectRoot, 'src/components/BottomNav.jsx'), 'utf8');
    const bottomNavCss = fs.readFileSync(path.join(projectRoot, 'src/components/BottomNav.css'), 'utf8');
    const androidPolishCss = fs.readFileSync(path.join(projectRoot, 'src/styles/androidPolish.css'), 'utf8');

    // Verifies Home is removed from navItems and default discovery is Match
    assert.doesNotMatch(bottomNavJsx, /path:\s*'\/dashboard'/);
    assert.doesNotMatch(bottomNavJsx, /label:\s*'Home'/);

    // Verifies all 5 core dating labels exist
    assert.match(bottomNavJsx, /label:\s*'Match'/);
    assert.match(bottomNavJsx, /label:\s*'Explore'/);
    assert.match(bottomNavJsx, /label:\s*'Chats'/);
    assert.match(bottomNavJsx, /label:\s*'Confessions'/);
    assert.match(bottomNavJsx, /label:\s*'Profile'/);

    // Verifies active route matching covers /profile sub-routes
    assert.match(bottomNavJsx, /startsWith\('\/profile'\)/);

    // Verifies compact padding and 9.5px micro-typography
    assert.match(bottomNavCss, /\.bottom-nav-item\s*\{[^}]*padding:\s*0\.35rem\s+0\.12rem;/);
    assert.match(bottomNavCss, /\.bottom-nav-label\s*\{[^}]*font-size:\s*(?:8\.8|9\.5)px;/);

    // Verifies native Android styling applies compact padding
    assert.match(androidPolishCss, /html\.is-native-app\s+\.bottom-nav-item\s*\{[^}]*padding:\s*0\.4rem\s+0\.12rem;/);
});

test('Phase 0 & 1 Quick Wins: 2. Symmetrical Connection Requests in Dashboard, Navbar, and Profile', () => {
    const navbarJsx = fs.readFileSync(path.join(projectRoot, 'src/components/Navbar.jsx'), 'utf8');
    const dashboardJsx = fs.readFileSync(path.join(projectRoot, 'src/pages/Dashboard.jsx'), 'utf8');
    const profileJsx = fs.readFileSync(path.join(projectRoot, 'src/pages/Profile.jsx'), 'utf8');

    // In Navbar, Requests must NOT be restricted to Female
    assert.doesNotMatch(navbarJsx, /userProfile\?\.role === 'Female'/);
    assert.match(navbarJsx, /to="\/requests"[\s\S]*?>\s*Requests\s*<\/Link>/);

    // In Dashboard, Requests must be symmetrical in actionCards
    assert.doesNotMatch(dashboardJsx, /title:\s*isFemale\s*\?\s*'Requests'/);
    assert.doesNotMatch(dashboardJsx, /to:\s*isFemale\s*\?\s*'\/requests'/);
    assert.match(dashboardJsx, /title:\s*'Requests'/);
    assert.match(dashboardJsx, /to:\s*'\/requests'/);

    // In Profile, Requests must NOT be restricted to Female
    assert.doesNotMatch(profileJsx, /userProfile\?\.role === 'Female' && \(\s*<button[^>]*onClick=\{[^}]*navigate\('\/requests'\)/);
    assert.match(profileJsx, /onClick=\{\(\) => navigate\('\/requests'\)\}[\s\S]*?<span className="card-title">Requests<\/span>/);
});

test('Phase 0 & 1 Quick Wins: 3. 1-Tap Campus Common Ground & Icebreaker Strip in Chat.jsx (Static & Architecture)', () => {
    const chatJsx = fs.readFileSync(path.join(projectRoot, 'src/pages/Chat.jsx'), 'utf8');
    const chatCss = fs.readFileSync(path.join(projectRoot, 'src/pages/Chat.css'), 'utf8');

    // Dead ICEBREAKERS array is completely removed
    assert.doesNotMatch(chatJsx, /const ICEBREAKERS = \[/);

    // Dynamic campus common ground and icebreaker functions exist
    assert.match(chatJsx, /function getCampusCommonGround/);
    assert.match(chatJsx, /function getCampusIcebreakers/);
    assert.match(chatJsx, /const handleSelectIcebreaker =/);

    // Empty conversation state renders common ground card and 1-tap icebreaker strip
    assert.match(chatJsx, /chat-empty-conversation-state/);
    assert.match(chatJsx, /chat-common-ground-card/);
    assert.match(chatJsx, /chat-icebreaker-chips/);
    assert.match(chatJsx, /handleSelectIcebreaker\(prompt\)/);

    // Chat CSS rules for empty state and light theme elevation
    assert.match(chatCss, /\.chat-empty-conversation-state/);
    assert.match(chatCss, /\.chat-common-ground-card/);
    assert.match(chatCss, /\.chat-icebreaker-chip/);
    assert.match(chatCss, /\[data-theme="light"\]\s+\.chat-common-ground-card/);
    assert.match(chatCss, /\[data-theme="light"\]\s+\.chat-icebreaker-chip/);
});

test('Phase 0 & 1 Quick Wins: 3.1 Empirical Execution: Level and Department Normalization', () => {
    // Academic Level normalizations
    assert.equal(formatStudentLevel('300L'), '300 Level');
    assert.equal(formatStudentLevel('100l'), '100 Level');
    assert.equal(formatStudentLevel('500'), '500 Level');
    assert.equal(formatStudentLevel('400 Level'), '400 Level');
    assert.equal(formatStudentLevel('Graduate'), 'Graduate');
    assert.equal(formatStudentLevel(''), '');
    assert.equal(formatStudentLevel(null), '');

    // Department prefix stripping
    assert.equal(formatDepartmentName('Department of Economics'), 'Economics');
    assert.equal(formatDepartmentName('Dept of Computer Science'), 'Computer Science');
    assert.equal(formatDepartmentName('dept. of Architecture'), 'Architecture');
    assert.equal(formatDepartmentName('Mass Communication'), 'Mass Communication');
    assert.equal(formatDepartmentName(null), '');
});

test('Phase 0 & 1 Quick Wins: 3.2 Empirical Execution: getCampusCommonGround across Edge Cases', () => {
    const studentA = {
        full_name: 'Zainab Balogun',
        university: 'University of Ibadan',
        department: 'Economics',
        level: '300L',
        interests: ['Poetry', 'Fashion', 'Music']
    };

    const studentB = {
        full_name: 'Tolu Adeleke',
        university: 'University of Ibadan',
        department: 'Economics',
        level: '300L',
        interests: ['music', 'Football']
    };

    // Same Campus & Same Department
    const commonBoth = getCampusCommonGround(studentA, studentB);
    assert.match(commonBoth.highlight, /share the same campus and department at University of Ibadan/);
    assert.equal(commonBoth.badges.some(b => b.label.includes('Same Campus: University of Ibadan')), true);
    assert.equal(commonBoth.badges.some(b => b.label.includes('Same Field: Economics')), true);
    assert.equal(commonBoth.badges.some(b => b.label === '300 Level'), true);
    // Case-insensitive interests match (Music vs music)
    assert.equal(commonBoth.badges.some(b => b.label.includes('Both like Music')), true);

    // Same Campus, Different Department
    const studentC = {
        full_name: 'Femi O.',
        university: 'University of Ibadan',
        department: 'Department of Law',
        level: '200L'
    };
    const commonUniOnly = getCampusCommonGround(studentA, studentC);
    assert.match(commonUniOnly.highlight, /both students at University of Ibadan/);
    assert.equal(commonUniOnly.badges.some(b => b.label.includes('Same Campus: University of Ibadan')), true);
    assert.equal(commonUniOnly.badges.some(b => b.label === 'Economics'), true);

    // Different Campus
    const studentD = {
        username: 'chidi_unn',
        university: 'UNN',
        department: 'Pharmacy'
    };
    const commonDiff = getCampusCommonGround(studentD, studentA);
    assert.match(commonDiff.highlight, /You and chidi_unn matched/);
    assert.equal(commonDiff.badges.some(b => b.label === 'UNN'), true);

    // Edge Cases: null and empty profiles
    assert.deepEqual(getCampusCommonGround(null, studentA), { highlight: '', badges: [] });
    const emptyResult = getCampusCommonGround({}, null);
    assert.ok(emptyResult.highlight);
    assert.deepEqual(emptyResult.badges, []);
});

test('Phase 0 & 1 Quick Wins: 3.3 Empirical Execution: getCampusIcebreakers across Edge Cases', () => {
    const studentUI = {
        full_name: 'Amaka Eze',
        university: 'UNILAG',
        department: 'Mass Communication'
    };
    const myProfileUNILAG = {
        university: 'unilag',
        department: 'Mass Communication'
    };

    // Same campus generates chill spot prompt
    const sameUniIcebreakers = getCampusIcebreakers(studentUI, myProfileUNILAG);
    assert.equal(Array.isArray(sameUniIcebreakers), true);
    assert.equal(sameUniIcebreakers.length >= 4, true);
    assert.match(sameUniIcebreakers[0], /favourite chill spot on campus/);
    assert.match(sameUniIcebreakers[1], /choose to study Mass Communication/);

    // Different campus generates campus life prompt
    const diffUniIcebreakers = getCampusIcebreakers(studentUI, { university: 'OAU' });
    assert.match(diffUniIcebreakers[0], /How is campus life at UNILAG/);

    // Null inputs return safe defaults without throwing
    const safeFallbacks = getCampusIcebreakers(null, null);
    assert.equal(Array.isArray(safeFallbacks), true);
    assert.equal(safeFallbacks.length >= 3, true);
    assert.match(safeFallbacks[0], /semester going so far/);
});

test('Phase 0 & 1 Quick Wins: 4. Standalone Curated Guest Preview & Tour Campus Demo in Landing', () => {
    const previewJsx = fs.readFileSync(path.join(projectRoot, 'src/components/CampusGuestPreview.jsx'), 'utf8');
    const previewCss = fs.readFileSync(path.join(projectRoot, 'src/components/CampusGuestPreview.css'), 'utf8');
    const landingJsx = fs.readFileSync(path.join(projectRoot, 'src/pages/Landing.jsx'), 'utf8');
    const landingCss = fs.readFileSync(path.join(projectRoot, 'src/pages/Landing.css'), 'utf8');

    // CampusGuestPreview component structure
    assert.match(previewJsx, /export default function CampusGuestPreview/);
    assert.match(previewJsx, /CURATED_STUDENTS/);
    assert.match(previewJsx, /CAMPUS_FILTERS/);
    assert.match(previewJsx, /guest-match-banner/);
    assert.match(previewJsx, /guest-icebreaker-demo/);
    assert.match(previewJsx, /to="\/signup"/);
    assert.match(previewJsx, /to="\/login"/);

    // CampusGuestPreview styles: Dark & Light theme tokens
    assert.match(previewCss, /\.guest-preview-modal/);
    assert.match(previewCss, /\.guest-student-card/);
    assert.match(previewCss, /\.guest-action-rail/);
    assert.match(previewCss, /\.guest-icebreaker-chip/);
    assert.match(previewCss, /\[data-theme="light"\]\s+\.guest-icebreaker-chip/);
    assert.match(previewCss, /\[data-theme="light"\]\s+\.guest-match-banner/);

    // Landing mounts CampusGuestPreview and Tour Campus Demo button
    assert.match(landingJsx, /import CampusGuestPreview from '\.\.\/components\/CampusGuestPreview';/);
    assert.match(landingJsx, /Tour Campus Demo/);
    assert.match(landingJsx, /<CampusGuestPreview/);

    // Landing CSS styles for demo button
    assert.match(landingCss, /\.landing-demo-button/);
    assert.match(landingCss, /\.btn-demo/);
});
