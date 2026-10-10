import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Explore.jsx: search input attributes, mobile IME enter key, and form submission blur', () => {
    const exploreCode = fs.readFileSync(path.resolve('src/pages/Explore.jsx'), 'utf-8');

    // 1. Search input attributes for mobile IME
    assert.match(exploreCode, /type="search"/, 'Search input must use type="search"');
    assert.match(exploreCode, /enterKeyHint="search"/, 'Search input must specify enterKeyHint="search"');

    // 2. onKeyDown handles Enter key, calls blur to dismiss Android keyboard, and triggers search
    assert.match(exploreCode, /onKeyDown=\{[^}]*e\.key\s*===\s*'Enter'[^}]*\}/s, 'Search input must handle Enter key');
    assert.match(exploreCode, /e\.target\.blur\(\)/, 'onKeyDown must blur input to dismiss Android soft keyboard');
    assert.match(exploreCode, /handlePerformSearch\(searchQuery\)/, 'onKeyDown must trigger search on Enter');

    // 3. Form onSubmit dismisses keyboard via blur
    assert.match(exploreCode, /document\.activeElement\?\.blur\(\)/, 'Form submit must blur active element to dismiss keyboard');
});

test('Explore.css: suppresses native WebKit search cancel pseudo-element on Android WebView', () => {
    const exploreCss = fs.readFileSync(path.resolve('src/pages/Explore.css'), 'utf-8');

    // Asserts ::-webkit-search-cancel-button is hidden to prevent duplicate clear buttons
    assert.match(exploreCss, /\.explore-search-input::-webkit-search-cancel-button[\s\S]*?display:\s*none;/);
});

test('Explore.jsx: handleClearSearch state reset, timer cancellation, and premature empty state suppression', () => {
    const exploreCode = fs.readFileSync(path.resolve('src/pages/Explore.jsx'), 'utf-8');

    // 1. handleClearSearch resets query, search results, and timer
    assert.match(exploreCode, /const\s+handleClearSearch\s*=\s*\(\)\s*=>\s*\{[\s\S]*?setSearchQuery\(''\);[\s\S]*?setDbSearchResults\(null\);[\s\S]*?setIsSearching\(false\);/);
    assert.match(exploreCode, /searchTimerRef\.current/);

    // 2. displayedProfiles fallback to discovery grid when search cleared
    assert.match(exploreCode, /const\s+displayedProfiles\s*=\s*\(dbSearchResults\s*!==\s*null\s*\?\s*dbSearchResults\s*:\s*filteredProfiles\)/);

    // 3. Category '🔴 Live' does not gatekeep active database search results
    assert.match(exploreCode, /if\s*\(dbSearchResults\s*===\s*null\s*&&\s*category\s*===\s*'🔴 Live'\)/);

    // 4. Searching state avoids premature flashing of "No students found"
    assert.match(exploreCode, /isSearching\s*\|\|\s*\(searchQuery\.trim\(\)\s*!==\s*''\s*&&\s*dbSearchResults\s*===\s*null\s*&&\s*filteredProfiles\.length\s*===\s*0\)/);
    assert.match(exploreCode, /<h2>Searching campus\.\.\.<\/h2>/);
});

test('swipeService.js: searchProfilesByName sanitization, connection inclusion, and photo gatekeeper', () => {
    const swipeCode = fs.readFileSync(path.resolve('src/services/swipeService.js'), 'utf-8');

    // 1. Sanitization: strips characters that break PostgREST .or() syntax
    assert.match(swipeCode, /replace\(\/\[,\(\)"'\[\\\]\\\\\]\/g,\s*' '\)/);

    // 2. Removal of connection over-exclusion: does NOT call fetchMatchedProfileIds
    const searchFunctionMatch = swipeCode.match(/export async function searchProfilesByName[\s\S]*?return \(data \|\| \[\]\)/);
    assert.ok(searchFunctionMatch, 'searchProfilesByName must exist');
    assert.doesNotMatch(searchFunctionMatch[0], /fetchMatchedProfileIds/, 'searchProfilesByName must not exclude matched connections or admirers');

    // 3. Multi-token compound query support
    assert.match(swipeCode, /const\s+tokens\s*=\s*cleanTerm\.split\(' '\)\.filter\(/);
    assert.match(swipeCode, /allTokenMatches/);

    // 4. Photo gatekeeper accepts avatar_url OR photos OR profile_photos
    assert.match(swipeCode, /hasProfilePhotos\s*\|\|\s*hasPhotos\s*\|\|\s*hasAvatar/);
});

test('androidPolish.css: avatars render strictly circular on Android native app', () => {
    const polishCss = fs.readFileSync(path.resolve('src/styles/androidPolish.css'), 'utf-8');

    // Asserts border-radius: 50% !important and overflow: hidden !important on native app avatars
    assert.match(polishCss, /html\.is-native-app\s+\.user-avatar-small,\s*html\.is-native-app\s+\.viewer-avatar\s*\{[^}]*border-radius:\s*50%\s*!important;\s*overflow:\s*hidden\s*!important;\s*aspect-ratio:\s*1\s*\/\s*1;/s);
});

test('Requests.css: circular avatar geometries, freemium blur, and circular placeholders', () => {
    const requestsCss = fs.readFileSync(path.resolve('src/pages/Requests.css'), 'utf-8');

    // 1. .user-avatar-small is circular with overflow hidden
    assert.match(requestsCss, /\.user-avatar-small\s*\{[^}]*border-radius:\s*50%;\s*overflow:\s*hidden;[^}]*aspect-ratio:\s*1\s*\/\s*1;/s);
    assert.match(requestsCss, /\.user-avatar-small\s+\.opt-image-container,\s*\.user-avatar-small\s+img\s*\{[^}]*border-radius:\s*50%;/s);

    // 2. .blurred-freemium blur filter
    assert.match(requestsCss, /\.user-avatar-small\.blurred-freemium\s+img,\s*\.user-avatar-small\.blurred-freemium\s+\.opt-image-container\s*\{[^}]*filter:\s*blur\(8px\);/s);
    assert.match(requestsCss, /\.blurred-freemium-text\s*\{[^}]*filter:\s*blur\(5px\);/s);

    // 3. Circular avatar placeholder
    assert.match(requestsCss, /\.user-avatar-small\s+\.avatar-placeholder\s*\{[^}]*border-radius:\s*50%;/s);
});

test('Requests.jsx & Viewers.jsx: priority={true} on avatar images and elimination of letter V fallback', () => {
    const requestsCode = fs.readFileSync(path.resolve('src/pages/Requests.jsx'), 'utf-8');
    const viewersCode = fs.readFileSync(path.resolve('src/pages/Viewers.jsx'), 'utf-8');

    // 1. Requests.jsx passes priority={true} to OptimizedImage
    assert.match(requestsCode, /<OptimizedImage[^>]*priority=\{true\}/s);

    // 2. Viewers.jsx passes priority={true} and height={80} to OptimizedImage
    assert.match(viewersCode, /<OptimizedImage[^>]*priority=\{true\}/s);
    assert.match(viewersCode, /<OptimizedImage[^>]*height=\{80\}/s);

    // 3. Elimination of hardcoded "Viewer" alt or letter "V" placeholder
    assert.match(viewersCode, /!isGenericName\s*\?\s*displayName\s*:\s*"Campus Student"/);
    assert.match(viewersCode, /item\.locked\s*\|\|\s*!isPremium\s*\?\s*'\?'\s*:\s*initial/);
});

test('OptimizedImage.jsx: generic alt fallback shielding and circular container conformity', () => {
    const optImgCode = fs.readFileSync(path.resolve('src/components/OptimizedImage.jsx'), 'utf-8');

    // 1. isGenericAlt regex covers generic words and does not produce single letter "V"
    assert.match(optImgCode, /viewer\|viewers\|visitor\|visitors\|admirer\|admirers/);
    assert.match(optImgCode, /fallbackText\s*=\s*!isGenericAlt\s*&&\s*trimmedAlt\.length\s*>\s*0\s*\?\s*trimmedAlt\.charAt\(0\)\.toUpperCase\(\)\s*:\s*'👤'/);

    // 2. opt-image-error-fallback respects borderRadius: 'inherit' and overflow: 'hidden'
    assert.match(optImgCode, /borderRadius:\s*'inherit',\s*overflow:\s*'hidden'/);
});

test('Database Migration: 20261008200000_include_photos_in_profile_viewers.sql integrity', () => {
    const migrationPath = path.resolve('supabase/migrations/20261008200000_include_photos_in_profile_viewers.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    assert.match(migrationSql, /create or replace function public\.get_profile_viewers_secure/);
    assert.match(migrationSql, /'profile_photos',\s*p\.profile_photos/);
    assert.match(migrationSql, /'photo_updated_at',\s*p\.photo_updated_at/);
    assert.match(migrationSql, /grant execute on function public\.get_profile_viewers_secure\(integer\) to authenticated;/);
});

test('Explore empty discovery contrast and atomic reset on handleViewAll', () => {
    const exploreCss = fs.readFileSync(path.resolve('src/pages/Explore.css'), 'utf-8');
    const exploreCode = fs.readFileSync(path.resolve('src/pages/Explore.jsx'), 'utf-8');

    // 1. .empty-discovery uses semantic high-contrast tokens
    assert.match(exploreCss, /\.empty-discovery\s*\{[^}]*color:\s*var\(--text-secondary/);
    assert.match(exploreCss, /\.empty-discovery\s+h2\s*\{[^}]*color:\s*var\(--text-primary/);
    assert.match(exploreCss, /\.empty-discovery\s+p\s*\{[^}]*color:\s*var\(--text-secondary/);

    // 2. handleViewAll atomically clears search
    assert.match(exploreCode, /const\s+handleViewAll\s*=\s*\(\)\s*=>\s*\{[\s\S]*?handleClearSearch\(\);/);
});

