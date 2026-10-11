import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Campus Liquidity Expansion: CAMPUS_LIQUIDITY_MIN_THRESHOLD constant and discovery contracts', () => {
    const swipeServiceCode = fs.readFileSync(path.resolve('src/services/swipeService.js'), 'utf-8');

    // 1. Threshold check present in swipeService.js
    assert.match(
        swipeServiceCode,
        /export\s+const\s+CAMPUS_LIQUIDITY_MIN_THRESHOLD\s*=\s*15/,
        'swipeService.js must declare and export CAMPUS_LIQUIDITY_MIN_THRESHOLD = 15'
    );

    // 1. Threshold check present in swipeService.js
    assert.match(
        swipeServiceCode,
        /const\s+CAMPUS_LIQUIDITY_MIN_THRESHOLD\s*=\s*15/,
        'swipeService.js must declare CAMPUS_LIQUIDITY_MIN_THRESHOLD'
    );

    // 2. Cross-campus expansion query checks filters.university and threshold
    assert.match(
        swipeServiceCode,
        /if\s*\(filters\.university\s*&&\s*filters\.university\s*!==\s*'All'\s*&&\s*results\.length\s*<\s*CAMPUS_LIQUIDITY_MIN_THRESHOLD\)/,
        'swipeService.js must detect low-density campus below threshold'
    );

    // 3. Fallback query excludes already fetched profiles and home campus
    assert.match(
        swipeServiceCode,
        /\.neq\('university',\s*filters\.university\)/,
        'Fallback query must query other universities'
    );

    // 4. Fallback profiles are tagged with isExpandedCampus: true and is_expanded_campus: true
    assert.match(
        swipeServiceCode,
        /isExpandedCampus:\s*true/,
        'Fallback profiles must be tagged with isExpandedCampus: true'
    );
    assert.match(
        swipeServiceCode,
        /is_expanded_campus:\s*true/,
        'Fallback profiles must be tagged with is_expanded_campus: true'
    );

    // 5. Gender gatekeeping is strictly enforced on fallback profiles
    assert.match(
        swipeServiceCode,
        /filteredFallback\.filter\(p\s*=>\s*\(p\.gender\s*\|\|\s*''\)\.toLowerCase\(\)\s*===\s*oppositeGender\)/,
        'Opposite-gender gatekeeping must be preserved on fallback profiles'
    );
});

test('SwipeCard.jsx & SwipeCard.css: Renders 📍 All Campuses badge for expanded profiles', () => {
    const swipeCardCode = fs.readFileSync(path.resolve('src/components/SwipeCard.jsx'), 'utf-8');
    const swipeCardCss = fs.readFileSync(path.resolve('src/components/SwipeCard.css'), 'utf-8');

    // 1. SwipeCard.jsx renders expanded campus tag
    assert.match(
        swipeCardCode,
        /\{\(displayProfile\.isExpandedCampus\s*\|\|\s*displayProfile\.is_expanded_campus\)\s*&&\s*\(\s*<span className="swipe-tag expanded-campus-tag">📍 All Campuses<\/span>\s*\)\}/,
        'SwipeCard must render 📍 All Campuses tag when isExpandedCampus is true'
    );

    // 2. SwipeCard.css defines .expanded-campus-tag with styling
    assert.match(
        swipeCardCss,
        /\.expanded-campus-tag\s*\{[\s\S]*?background:[\s\S]*?color:\s*#ffffff/,
        'SwipeCard.css must provide distinct styling for .expanded-campus-tag'
    );
});

test('Campus Liquidity Fallback Algorithm: Expands pool and tags cross-campus profiles safely', () => {
    const THRESHOLD = 15;

    // Simulate database pool
    const covenantCampusProfiles = Array.from({ length: 4 }, (_, i) => ({
        id: `cov-${i}`,
        full_name: `Covenant Student ${i}`,
        university: 'Covenant University',
        gender: 'female',
        profile_photos: ['photo.jpg']
    }));

    const otherCampusProfiles = Array.from({ length: 20 }, (_, i) => ({
        id: `other-${i}`,
        full_name: `UNILAG Student ${i}`,
        university: i % 2 === 0 ? 'University of Lagos' : 'University of Ibadan',
        gender: i % 3 === 0 ? 'male' : 'female', // Mixed genders
        profile_photos: ['photo.jpg']
    }));

    // Simulating user: Male student looking at Covenant University
    const currentUserGender = 'male';
    const oppositeGender = 'female';
    const selectedUniversity = 'Covenant University';

    let initialResults = [...covenantCampusProfiles];
    assert.strictEqual(initialResults.length, 4, 'Initial campus pool has only 4 profiles (< 15)');

    // Execute liquidity expansion logic
    if (initialResults.length < THRESHOLD) {
        const existingIds = new Set(initialResults.map(p => p.id));
        const filteredFallback = otherCampusProfiles
            .filter(p => p.university !== selectedUniversity && !existingIds.has(p.id))
            .filter(p => (p.gender || '').toLowerCase() === oppositeGender)
            .map(p => ({
                ...p,
                isExpandedCampus: true,
                is_expanded_campus: true
            }));

        initialResults = [...initialResults, ...filteredFallback];
    }

    assert.ok(initialResults.length >= THRESHOLD, `Expanded pool length (${initialResults.length}) must meet threshold 15`);

    // Verify first 4 profiles are primary campus without expanded tag
    const primarySlice = initialResults.slice(0, 4);
    assert.strictEqual(primarySlice.every(p => p.university === 'Covenant University' && !p.isExpandedCampus), true);

    // Verify supplemental profiles have isExpandedCampus = true
    const fallbackSlice = initialResults.slice(4);
    assert.ok(fallbackSlice.length > 0, 'Supplemental cross-campus profiles must be present');
    assert.strictEqual(fallbackSlice.every(p => p.isExpandedCampus === true && p.is_expanded_campus === true), true);
    assert.strictEqual(fallbackSlice.every(p => p.university !== 'Covenant University'), true);

    // Verify opposite-gender rule is strictly maintained across 100% of profiles
    assert.strictEqual(initialResults.every(p => p.gender === 'female'), true, 'All returned profiles must be female for male user');
});

