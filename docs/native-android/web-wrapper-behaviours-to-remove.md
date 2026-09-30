# Web-Wrapper Behaviours to Remove in Native Android

Date: 2026-08-01  
Scope: Comprehensive audit of browser-like, webview-specific, and web-framework limitations in the live Capacitor wrapper (`com.collegedate.app`), paired with authoritative Native Android (Jetpack Compose / Kotlin) replacements.

---

## 1. Executive Summary

The current live application is delivered as a Single Page Application (SPA) inside a Capacitor Android WebView container. While optimized with SWR persistent caching and custom CSS `--vh` viewport hacks, it retains inherent web-wrapper behaviors that impair the native Android user experience.

This document audits 20 specific web-wrapper limitations and specifies their native Android Jetpack Compose replacements.

---

## 2. Web-Wrapper Limitations & Native Android Replacements

### 1. Browser-Like Page Refreshes & White Flashes
- **Web-Wrapper Issue**: Cold launches and chunk reloads occasionally trigger a white blank screen flash before CSS bundles execute.
- **Root Cause**: Web browser engine initializing DOM document root (`index.html`) inside `WebView`.
- **Native Android Replacement**: Use Android 12+ `SplashScreen` API (`androidx.core.splashscreen.SplashScreen`). Render native Jetpack Compose theme background instantly without white flashes.

### 2. Viewport Scale & Pinch Zoom Anomalies
- **Web-Wrapper Issue**: Double-tapping inputs or quick multi-touch gestures can occasionally trigger unwanted viewport zoom or scale shifts.
- **Root Cause**: HTML viewport meta tag (`user-scalable=no`) enforced via browser engine rather than native window constraints.
- **Native Android Replacement**: Native Android layouts do not have viewport zooming. Compose renders directly to Skia / SurfaceFlinger canvas.

### 3. Horizontal Overflow & Text Clipping
- **Web-Wrapper Issue**: Long usernames, university names, or badged pills can cause horizontal scrolling or overflow truncation on small screens (360dp width).
- **Root Cause**: CSS flexbox/grid containers without explicit text wrap or max-width constraints.
- **Native Android Replacement**: Jetpack Compose `Text` with `maxLines = 1`, `overflow = TextOverflow.Ellipsis`, and dynamic scaling using Material 3 typography.

### 4. Non-Native Back-Button Navigation Stack
- **Web-Wrapper Issue**: Pressing the Android physical/gesture back button sometimes exits the app or navigates backwards through web history states unexpectedly.
- **Root Cause**: Web Router browser history state (`window.history.back()`) bridged through Capacitor back button listener.
- **Native Android Replacement**: Use `androidx.navigation.compose` with Jetpack Compose `NavHost` and `BackHandler`. Standardized back navigation matching Android Design Guidelines.

### 5. Delayed Soft Keyboard Resizing & Input Occlusion
- **Web-Wrapper Issue**: Opening the soft keyboard in Chat or Onboarding pushes content upward with a delayed layout jump, occasionally obscuring the active text input.
- **Root Cause**: Web browser resizing viewport using JavaScript custom CSS property listener (`--vh`).
- **Native Android Replacement**: Use native Android `WindowInsets.ime` padding in Jetpack Compose (`Modifier.imePadding()`). The keyboard smoothly animates along with the layout in 60/120Hz.

### 6. Forms Hidden Behind Soft Keyboard
- **Web-Wrapper Issue**: In Signup and Edit Profile, lower input fields remain hidden behind the keyboard when focused.
- **Root Cause**: Web page scroll container failing to scroll focused DOM input into view automatically.
- **Native Android Replacement**: Wrap forms in Compose `Column` with `Modifier.verticalScroll(rememberScrollState())` and automatic `bringIntoViewRequester` on focus.

### 7. Non-Native HTML `<select>` Dropdowns
- **Web-Wrapper Issue**: Selecting a university or department in Onboarding displays an ugly, browser-default HTML select dialog.
- **Root Cause**: HTML `<select>` element rendered by Chromium WebView.
- **Native Android Replacement**: Material 3 `ExposedDropdownMenuBox` with native Compose `DropdownMenuItem` or a full-screen Material 3 `ModalBottomSheet` selector.

### 8. HTML File Input for Photo Uploads (`<input type="file">`)
- **Web-Wrapper Issue**: Tapping "Upload Photo" triggers the generic web browser file chooser dialog ("Files", "Drive", "Gallery").
- **Root Cause**: HTML `<input type="file" accept="image/*">` web standard.
- **Native Android Replacement**: Native Android Photo Picker (`ActivityResultContracts.PickVisualMedia`) for secure, high-performance image selection without requesting broad storage permissions.

### 9. Small Touch Targets (< 48dp)
- **Web-Wrapper Issue**: Secondary icons in Chat (emoji, camera, send) and card dismiss buttons have small touch targets (~32px), leading to mis-taps.
- **Root Cause**: Desktop-first CSS pixel dimensions.
- **Native Android Replacement**: Enforce minimum 48dp x 48dp touch targets on all interactive Compose buttons according to Material 3 accessibility guidelines (`Modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)`).

### 10. Blank Screen States During Network Loss
- **Web-Wrapper Issue**: Losing internet connectivity while navigating to a new tab can display a blank page or unhandled fetch error banner.
- **Root Cause**: Uncached web route chunks or failed dynamic JS module imports.
- **Native Android Replacement**: Local-first architecture powered by Room DB and `Flow`. The UI always renders instantly from local database cache while background workers attempt synchronization.

### 11. Weak Offline Image & Media Caching
- **Web-Wrapper Issue**: Profile photos and avatar images reload over the network when navigating back and forth between screens.
- **Root Cause**: Browser HTTP cache subject to memory pressure and cache eviction.
- **Native Android Replacement**: Use Coil image loading library (`io.coil-kt:coil-compose`) with disk caching, memory caching, and progressive JPEG rendering.

### 12. Inconsistent System Status Bar & Navigation Bar Insets
- **Web-Wrapper Issue**: Content occasionally bleeds under the Android status bar notch or gesture navigation bar.
- **Root Cause**: CSS `env(safe-area-inset-top)` polyfill inconsistencies across different Android OEM ROMs (Samsung OneUI, Xiaomi MIUI, Transsion HiOS).
- **Native Android Replacement**: Use `enableEdgeToEdge()` in `MainActivity.kt` paired with `WindowInsets.statusBars` and `WindowInsets.navigationBars` in Compose.

### 13. Touch Drag Jitter in Swipe Card Animations
- **Web-Wrapper Issue**: Fast profile card swiping can experience visual frame drops or touch drag latency on mid-range Android devices (e.g. MediaTek Helio processors).
- **Root Cause**: Framer-motion CSS transform calculations executing on the single-threaded WebView JavaScript thread.
- **Native Android Replacement**: Hardware-accelerated Jetpack Compose `Modifier.pointerInput` and `Animatable` graphics layers executing directly on the Android RenderThread.

### 14. Web-Style Toast Notifications
- **Web-Wrapper Issue**: Toast alerts float in arbitrary screen positions and can be covered by the bottom navigation bar.
- **Root Cause**: Custom React `<ToastProvider>` rendering fixed-position HTML divs.
- **Native Android Replacement**: Material 3 `SnackbarHost` attached to Compose `Scaffold`, automatically positioned above the bottom navigation bar.

### 15. Web OneSignal Script Injection & Polling
- **Web-Wrapper Issue**: Web app attempts to load `OneSignalSDK.page.js` web SDK script on startup.
- **Root Cause**: Web push notification listener designed for desktop browsers.
- **Native Android Replacement**: Use native Firebase Cloud Messaging (FCM) SDK (`com.google.firebase:firebase-messaging`) paired with native OneSignal Android SDK.

### 16. Manual Viewport Height (`--vh`) CSS Hacks
- **Web-Wrapper Issue**: Code contains custom JavaScript event listeners to compute `window.innerHeight * 0.01` and assign `--vh` CSS variables.
- **Root Cause**: Workaround for mobile browser dynamic URL bar and soft keyboard resizing bugs.
- **Native Android Replacement**: Remove all `--vh` hacks. Compose automatically handles screen bounds and window insets.

### 17. Web Clipboard API Fallbacks
- **Web-Wrapper Issue**: Copying referral codes uses `navigator.clipboard.writeText` which fails if document focus is lost.
- **Root Cause**: Web browser security restrictions on Clipboard API.
- **Native Android Replacement**: Native Android `ClipboardManager` (`context.getSystemService(Context.CLIPBOARD_SERVICE)`).

### 18. Manual DOM Local Storage Purging During Sign-Out
- **Web-Wrapper Issue**: Signing out iterates through browser `localStorage` and `sessionStorage` keys to clear state.
- **Root Cause**: Web SPA storage management.
- **Native Android Replacement**: Encrypted DataStore clearing (`Context.dataStore.edit { it.clear() }`) and Room DB deletion (`database.clearAllTables()`) inside Hilt singleton scope.

### 19. Web SWR Revalidation Loops on Window Focus
- **Web-Wrapper Issue**: Switching back to the app from another background app causes SWR to re-fetch all active queries simultaneously, causing network bursts.
- **Root Cause**: SWR `revalidateOnFocus: true` web behavior.
- **Native Android Replacement**: Reactive Kotlin `StateFlow` and Supabase Realtime WebSocket listeners. Background sync is managed cleanly via Android `WorkManager`.

### 20. Non-Native Dialog Overlays
- **Web-Wrapper Issue**: Confirmation modals (Logout, Delete Account, Super Swipe purchase) use custom HTML div overlays with static backdrop blurs.
- **Root Cause**: Web DOM modal implementations.
- **Native Android Replacement**: Material 3 `AlertDialog` and `ModalBottomSheet` with native backdrop dimming and system animation curves.

---

## 3. Verification & Compliance Notes

- **All 20 web-wrapper limitations audited and paired with explicit Native Android replacements.**
- **No changes made to existing web files.**
- **Stage 5 Web-Wrapper Removal Audit Complete.**
