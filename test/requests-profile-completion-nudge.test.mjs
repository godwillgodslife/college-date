import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Requests Profile Completion Nudge - calculateProfileStrength formula & parity', async () => {
    const { calculateProfileStrength, getNextProfileCompletionStep } = await import('../src/utils/profileData.js');

    // Test 1: Empty profile
    assert.strictEqual(calculateProfileStrength({}), 0, 'Empty profile must have 0% strength');

    // Test 2: Photo only (+30%)
    const photoOnly = { avatar_url: 'https://example.com/avatar.jpg' };
    assert.strictEqual(calculateProfileStrength(photoOnly), 30, 'Photo only should be 30%');

    // Test 3: Photo + Bio (+50%)
    const photoAndBio = {
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Mechanical engineering student who loves photography and coding'
    };
    assert.strictEqual(calculateProfileStrength(photoAndBio), 50, 'Photo + Bio should be 50%');

    // Test 4: Photo + Bio + 3 Interests (+65%)
    const withInterests = {
        ...photoAndBio,
        interests: ['Coding', 'Chess', 'Music']
    };
    assert.strictEqual(calculateProfileStrength(withInterests), 65, 'Photo + Bio + Interests should be 65%');

    // Test 5: Photo + Bio + 3 Interests + Level + Email (+85%)
    const highProfile = {
        ...withInterests,
        level: '300 Level',
        email: 'student@unilag.edu.ng'
    };
    assert.strictEqual(calculateProfileStrength(highProfile), 85, 'High profile without prompt should be 85%');

    // Next step for 85% should be short intro prompt
    const nextForHigh = getNextProfileCompletionStep(highProfile);
    assert.ok(nextForHigh, 'Next step should exist for 85% profile');
    assert.strictEqual(nextForHigh.id, 'prompt', 'Next step should be intro prompt');
    assert.strictEqual(nextForHigh.bonus, '+15%');

    // Test 6: 100% Complete Profile
    const completeProfile = {
        ...highProfile,
        intro_prompt: 'Looking for study partners and good conversation'
    };
    assert.strictEqual(calculateProfileStrength(completeProfile), 100, 'Complete profile should be 100%');
    assert.strictEqual(getNextProfileCompletionStep(completeProfile), null, '100% profile should have no missing step');

    // Test 7: DB Fallback is respected if DB score is higher
    assert.strictEqual(calculateProfileStrength({ ...photoOnly, completion_score: 75 }), 75);
});

test('Requests Page - Profile Nudge Card JSX Contracts & Intuitive Rules', () => {
    const reqJsxPath = path.join(rootDir, 'src', 'pages', 'Requests.jsx');
    assert.ok(fs.existsSync(reqJsxPath), 'Requests.jsx must exist');
    const jsx = fs.readFileSync(reqJsxPath, 'utf8');

    // 1. Must import calculateProfileStrength and getNextProfileCompletionStep from profileData
    assert.ok(
        jsx.includes('calculateProfileStrength') && jsx.includes('getNextProfileCompletionStep'),
        'Must import calculateProfileStrength and getNextProfileCompletionStep'
    );

    // 2. Must compute profileStrength and nextStep
    assert.ok(jsx.includes('calculateProfileStrength(userProfile'), 'Must compute profileStrength dynamically');
    assert.ok(jsx.includes('getNextProfileCompletionStep(userProfile)'), 'Must compute nextStep dynamically');

    // 3. Intuitive presence rule: Must show ONLY when profileStrength < 80 (and automatically go off when >= 80)
    assert.ok(
        jsx.includes('profileStrength < 80'),
        'Card must know to be there when profileStrength < 80 and go off when >= 80'
    );

    // 4. Must render exact real profile strength percentage in heading
    assert.ok(
        jsx.includes('<h3>Your profile is {profileStrength}% complete</h3>'),
        'Must render real profileStrength in heading'
    );

    // 5. Must render progress bar and dynamic tier chip
    assert.ok(jsx.includes('className="nudge-progress-track"'), 'Must render progress track');
    assert.ok(jsx.includes('className="nudge-progress-bar"'), 'Must render progress bar');
    assert.ok(jsx.includes('width: `${profileStrength}%`'), 'Progress bar width must bind to profileStrength');
    assert.ok(jsx.includes('className="nudge-tier-chip"'), 'Must render tier chip');

    // 6. Must have Finish Setup CTA button and dismiss button
    assert.ok(jsx.includes('className="btn-nudge-action"'), 'Must have Finish Setup action button');
    assert.ok(jsx.includes('className="nudge-dismiss-btn"'), 'Must have dismiss button');
    assert.ok(jsx.includes('handleDismissNudge'), 'Must wire handleDismissNudge');

    // 7. Dynamic warning vs progress icon
    assert.ok(
        jsx.includes("profileStrength < 50 ? '⚠️' : '⚡'"),
        'Must use warning icon under 50% and thunder progress icon above 50%'
    );
});

test('Requests Page - Profile Nudge Card CSS & Styling Contracts', () => {
    const reqCssPath = path.join(rootDir, 'src', 'pages', 'Requests.css');
    assert.ok(fs.existsSync(reqCssPath), 'Requests.css must exist');
    const css = fs.readFileSync(reqCssPath, 'utf8');

    // 1. Base card styling
    assert.ok(css.includes('.completion-nudge-card'), 'Must style .completion-nudge-card');
    assert.ok(css.includes('.completion-nudge-card.is-warning'), 'Must style warning tier');
    assert.ok(css.includes('.completion-nudge-card.is-progress'), 'Must style progress tier');

    // 2. Progress bar styling
    assert.ok(css.includes('.nudge-progress-track'), 'Must style progress track');
    assert.ok(css.includes('.nudge-progress-bar'), 'Must style progress bar');

    // 3. Action button styling
    assert.ok(css.includes('.btn-nudge-action'), 'Must style .btn-nudge-action');
    assert.ok(css.includes('.nudge-tier-chip'), 'Must style .nudge-tier-chip');

    // 4. Light theme overrides
    assert.ok(css.includes('html[data-theme="light"] .completion-nudge-card'), 'Must support light theme card');
    assert.ok(css.includes('html[data-theme="light"] .completion-nudge-card.is-warning'), 'Must support light theme warning');
    assert.ok(css.includes('html[data-theme="light"] .completion-nudge-card.is-progress'), 'Must support light theme progress');
});

test('Android Polish - High Contrast Native Overrides', () => {
    const androidCssPath = path.join(rootDir, 'src', 'styles', 'androidPolish.css');
    const androidCss = fs.readFileSync(androidCssPath, 'utf8');

    assert.ok(androidCss.includes('html.is-native-app .completion-nudge-card'), 'Android must style completion nudge card');
    assert.ok(androidCss.includes('html.is-native-app[data-theme="light"] .completion-nudge-card'), 'Android light theme must style completion nudge card');
});
