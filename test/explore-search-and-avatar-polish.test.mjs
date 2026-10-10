import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { calculateActiveFilterCount, DEFAULT_EXPLORE_FILTERS, createDefaultExploreFilters } from '../src/utils/exploreFilters.js';

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

test('calculateActiveFilterCount: baseline defaults, individual filters, compound filters, and edge cases', () => {
    // 1. Defaults produce count 0
    assert.equal(calculateActiveFilterCount(DEFAULT_EXPLORE_FILTERS), 0);
    assert.equal(calculateActiveFilterCount(createDefaultExploreFilters()), 0);
    assert.equal(calculateActiveFilterCount({ gender: 'All', university: 'All', ageRange: [18, 50] }), 0);

    // 2. Case-insensitivity & whitespace normalization
    assert.equal(calculateActiveFilterCount({ gender: 'all', university: 'all', ageRange: [18, 50] }), 0);
    assert.equal(calculateActiveFilterCount({ gender: 'ALL', university: 'ALL', ageRange: [18, 50] }), 0);
    assert.equal(calculateActiveFilterCount({ gender: '  All  ', university: '  all universities  ', ageRange: [18, 50] }), 0);

    // 3. Gender filter active
    assert.equal(calculateActiveFilterCount({ gender: 'Men', university: 'All', ageRange: [18, 50] }), 1);
    assert.equal(calculateActiveFilterCount({ gender: 'Women', university: 'All', ageRange: [18, 50] }), 1);
    assert.equal(calculateActiveFilterCount({ gender: 'Non-binary', university: 'All', ageRange: [18, 50] }), 1);

    // 4. University & School alias filter active
    assert.equal(calculateActiveFilterCount({ gender: 'All', university: 'University of Lagos', ageRange: [18, 50] }), 1);
    assert.equal(calculateActiveFilterCount({ gender: 'All', university: 'Covenant University', ageRange: [18, 50] }), 1);
    assert.equal(calculateActiveFilterCount({ gender: 'All', school: 'Obafemi Awolowo University', ageRange: [18, 50] }), 1);

    // 5. Age range filter active & boundary/invalid edge cases
    assert.equal(calculateActiveFilterCount({ gender: 'All', university: 'All', ageRange: [20, 50] }), 1);
    assert.equal(calculateActiveFilterCount({ gender: 'All', university: 'All', ageRange: [18, 30] }), 1);
    assert.equal(calculateActiveFilterCount({ gender: 'All', university: 'All', ageRange: [21, 28] }), 1);
    assert.equal(calculateActiveFilterCount({ gender: 'All', university: 'All', ageRange: ['18', '50'] }), 0);
    assert.equal(calculateActiveFilterCount({ gender: 'All', university: 'All', ageRange: ['20', '35'] }), 1);
    assert.equal(calculateActiveFilterCount({ gender: 'All', university: 'All', ageRange: [NaN, 50] }), 0);
    assert.equal(calculateActiveFilterCount({ gender: 'All', university: 'All', ageRange: [18] }), 0);
    assert.equal(calculateActiveFilterCount({ gender: 'All', university: 'All', ageRange: [] }), 0);

    // 6. Compound filters & liveOnly
    assert.equal(calculateActiveFilterCount({ gender: 'Men', university: 'UNILAG', ageRange: [18, 50] }), 2);
    assert.equal(calculateActiveFilterCount({ gender: 'Women', university: 'UNILAG', ageRange: [19, 25] }), 3);
    assert.equal(calculateActiveFilterCount({ gender: 'Women', university: 'UNILAG', ageRange: [19, 25], liveOnly: true }), 4);

    // 7. Safe edge cases on null, undefined, primitives, arrays
    assert.equal(calculateActiveFilterCount(null), 0);
    assert.equal(calculateActiveFilterCount(undefined), 0);
    assert.equal(calculateActiveFilterCount({}), 0);
    assert.equal(calculateActiveFilterCount([]), 0);
    assert.equal(calculateActiveFilterCount('string'), 0);
    assert.equal(calculateActiveFilterCount(123), 0);
    assert.equal(calculateActiveFilterCount({ gender: '', university: '' }), 0);

    // 8. createDefaultExploreFilters produces independent mutable copies
    const defaultA = createDefaultExploreFilters();
    const defaultB = createDefaultExploreFilters();
    assert.notEqual(defaultA, defaultB);
    defaultA.gender = 'Men';
    assert.equal(defaultB.gender, 'All');
});

test('Explore.jsx: active filter counter badge, WAI-ARIA disclosure, and UI integration', () => {
    const exploreCode = fs.readFileSync(path.resolve('src/pages/Explore.jsx'), 'utf-8');

    // 1. Imports calculateActiveFilterCount and createDefaultExploreFilters utility
    assert.match(exploreCode, /import\s*\{[^}]*calculateActiveFilterCount[^}]*createDefaultExploreFilters[^}]*\}\s*from\s*['"]\.\.\/utils\/exploreFilters['"]/);

    // 2. Initializes filters and computes activeFilterCount via useMemo
    assert.match(exploreCode, /const\s+\[filters,\s*setFilters\]\s*=\s*useState\(createDefaultExploreFilters\);/);
    assert.match(exploreCode, /const\s+activeFilterCount\s*=\s*useMemo\(\s*\(\)\s*=>\s*calculateActiveFilterCount\(filters\),\s*\[filters\]\s*\);/);

    // 3. explore-filter-btn dynamically appends has-active-filters class and WAI-ARIA disclosure attributes
    assert.match(exploreCode, /className=\{`explore-filter-btn\s+\$\{showFilters\s*\?\s*'active'\s*:\s*''\}\s+\$\{activeFilterCount\s*>\s*0\s*\?\s*'has-active-filters'\s*:\s*''\}`\}/);
    assert.match(exploreCode, /aria-expanded=\{showFilters\}/);
    assert.match(exploreCode, /aria-controls="explore-filter-panel"/);

    // 4. explore-filter-btn renders filter-badge with active count and aria-hidden="true"
    assert.match(exploreCode, /\{activeFilterCount\s*>\s*0\s*&&\s*\(\s*<span\s+className="filter-badge"\s+aria-hidden="true"[^>]*>\s*\{activeFilterCount\}\s*<\/span>\s*\)\}/s);

    // 5. Filter panel includes accessibility role, active counter badge, and atomic Reset button
    assert.match(exploreCode, /id="explore-filter-panel"/);
    assert.match(exploreCode, /<span\s+className="filter-count-badge">\{activeFilterCount\}\s*active<\/span>/);
    assert.match(exploreCode, /className="btn-filter-reset"[\s\S]*?onClick=\{\(\)\s*=>\s*setFilters\(createDefaultExploreFilters\(\)\)\}/);

    // 6. Empty discovery state informs user about active filters and provides clear primary CTA
    assert.match(exploreCode, /activeFilterCount\s*>\s*0\s*\?\s*'No matching students'/);
    assert.match(exploreCode, /activeFilterCount\s*>\s*0\s*\?\s*['"]No students match your active filters/);
    assert.match(exploreCode, /activeFilterCount\s*>\s*0\s*\?\s*['"]Clear Filters & Show All['"]\s*:\s*['"]View All Profiles['"]/);
});

test('Explore.css: active filter badge styling, theme contrast, and 360dp mobile layout', () => {
    const exploreCss = fs.readFileSync(path.resolve('src/pages/Explore.css'), 'utf-8');

    // 1. .explore-filter-btn uses inline-flex and gap for icon + badge alignment
    assert.match(exploreCss, /\.explore-filter-btn\s*\{[^}]*display:\s*inline-flex;[^}]*gap:\s*0\.35rem;/s);

    // 2. .explore-filter-btn.has-active-filters highlights active state and active/open inverted styling
    assert.match(exploreCss, /\.explore-filter-btn\.has-active-filters\s*\{[^}]*border-color:\s*var\(--accent-primary/s);
    assert.match(exploreCss, /\.explore-filter-btn\.has-active-filters\.active/);

    // 3. .filter-badge defines pill dimensions, border-radius, and high-contrast text
    assert.match(exploreCss, /\.explore-filter-btn\s+\.filter-badge\s*\{[^}]*border-radius:\s*9999px;[^}]*color:\s*#ffffff\s*!important;[^}]*font-weight:\s*700;/s);

    // 4. Light and Dark Theme overrides
    assert.match(exploreCss, /html\[data-theme="light"\]\s+\.explore-filter-btn\.has-active-filters/);
    assert.match(exploreCss, /html\[data-theme="dark"\]\s+\.explore-filter-btn\.has-active-filters/);

    // 5. Filter panel header badges and reset button
    assert.match(exploreCss, /\.filter-count-badge\s*\{[^}]*border-radius:\s*9999px;/s);
    assert.match(exploreCss, /\.btn-filter-reset\s*\{[^}]*color:\s*#ef4444\s*!important;/s);

    // 6. 360dp mobile responsive adjustments in @media (max-width: 480px)
    assert.match(exploreCss, /@media\s*\(max-width:\s*480px\)[\s\S]*?\.explore-filter-btn\s*\{[^}]*padding:\s*0\.42rem\s*0\.6rem;[\s\S]*?\.explore-filter-btn\s+\.filter-badge\s*\{[^}]*min-width:\s*1rem;/s);
});


