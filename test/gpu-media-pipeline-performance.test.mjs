import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('androidPolish.css: GPU backdrop-filter stalls eliminated on Android native app', () => {
    const css = fs.readFileSync(path.resolve('src/styles/androidPolish.css'), 'utf-8');

    // Verify backdrop-filter: none !important on native app key surfaces
    assert.match(css, /html\.is-native-app\s+\.glass-panel/);
    assert.match(css, /html\.is-native-app\s+\.bottom-nav/);
    assert.match(css, /html\.is-native-app\s+\.chat-header/);
    assert.match(css, /html\.is-native-app\s+\.modal-backdrop/);
    assert.match(css, /backdrop-filter:\s*none\s*!important/);
    assert.match(css, /-webkit-backdrop-filter:\s*none\s*!important/);

    // Verify solid/semi-opaque fills for dark and light native themes
    assert.match(css, /html\.is-native-app\[data-theme="dark"\]\s+\.bottom-nav/);
    assert.match(css, /background:\s*rgba\(18,\s*18,\s*26,\s*0\.96\)\s*!important/);
    assert.match(css, /html\.is-native-app\[data-theme="light"\]\s+\.bottom-nav/);
    assert.match(css, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.98\)\s*!important/);
});

test('Match.jsx: Quadruple-redundant hidden DOM image preloader removed', () => {
    const matchCode = fs.readFileSync(path.resolve('src/pages/Match.jsx'), 'utf-8');

    // Verify hidden DOM preloader block is completely gone
    assert.doesNotMatch(matchCode, /HIDDEN PRELOADER:\s*Silently download the next 5 profiles/);
    assert.doesNotMatch(matchCode, /key=\{\s*`preload-\$\{profile\.id\}`\s*\}/);
});

test('SwipeCard.jsx: Debug logging throttled to displayProfile.id and single next photo cached without new Image() duplicate', () => {
    const swipeCode = fs.readFileSync(path.resolve('src/components/SwipeCard.jsx'), 'utf-8');

    // Verify debug useEffect has [displayProfile?.id] dependency array and checks isSwipeDebugEnabled
    assert.match(swipeCode, /if\s*\(isSwipeDebugEnabled\(\)\)\s*\{[\s\S]*recordSwipeDebug[\s\S]*\}\s*,\s*\[displayProfile\?\.id\]\);/);

    // Verify next photo preloading does NOT create parallel new Image() instance
    assert.doesNotMatch(swipeCode, /const\s+nextImg\s*=\s*new\s+Image\(\);/);
    assert.match(swipeCode, /cacheMediaSource\(nextUrl\)\.catch\(\(\)\s*=>\s*\{\}\);/);
});

test('OptimizedImage.jsx: Cache hydration guarded against error loops and fallbacks correctly', () => {
    const optImgCode = fs.readFileSync(path.resolve('src/components/OptimizedImage.jsx'), 'utf-8');

    // Verify cache hydration exits early if in error state
    assert.match(optImgCode, /if\s*\(!optimizedUrl\s*\|\|\s*hasError\)\s*return;/);

    // Verify fallback from failed blob URL to network URL before setting error
    assert.match(optImgCode, /if\s*\(cachedDisplay\.url\s*&&\s*displayUrl\s*===\s*cachedDisplay\.url\)/);
    assert.match(optImgCode, /setCachedDisplay\(\{\s*source:\s*null,\s*url:\s*null\s*\}\);/);
});

test('mediaCache.js: Tracks failed URLs and deduplicates in-flight fetches to prevent memory exhaustion', () => {
    const cacheCode = fs.readFileSync(path.resolve('src/lib/mediaCache.js'), 'utf-8');

    // Verify deduplication sets exist
    assert.match(cacheCode, /const\s+failedCacheUrls\s*=\s*new\s+Set\(\);/);
    assert.match(cacheCode, /const\s+inFlightFetches\s*=\s*new\s+Map\(\);/);

    // Verify failedCacheUrls check
    assert.match(cacheCode, /if\s*\(failedCacheUrls\.has\(src\)\)\s*\{?\s*return\s*null;/);

    // Verify inFlightFetches check and cleanup
    assert.match(cacheCode, /if\s*\(inFlightFetches\.has\(src\)\)\s*\{?\s*return\s*inFlightFetches\.get\(src\);/);
    assert.match(cacheCode, /inFlightFetches\.delete\(src\);/);
});
