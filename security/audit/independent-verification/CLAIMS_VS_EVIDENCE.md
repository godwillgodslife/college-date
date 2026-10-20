# Claims vs Evidence — Comprehensive Independent Verification Matrix

**Project**: The College Date (CD2.0)  
**Evaluated Version**: `v2.2.70` (Android Version Code `67`)  
**Methodology**: Direct source code inspection, AST/regex parsing, physical artifact binary decompilation, PL/pgSQL review, and adversarial edge-case simulation.

---

## Finding A (VULN-CD-001): Referral Milestone Infinite Money Glitch

### 1. Original Risk
A high-concurrency race condition and absence of stateful award tracking in `public.process_referral_milestones` permitted users with 10 or more referrals to call the RPC function repeatedly (or concurrently) and receive ₦3,000 NGN into their withdrawable wallet balance on each call without limit.

### 2. Files & Code Reviewed
- `supabase/migrations/20261020120000_critical_security_audit_hardening.sql` (lines 9–105)
- Prior definition: `supabase/migrations/20260408170000_production_payouts_and_referral_rewards.sql` (lines 142–186)
- Test suite: `test/security-audit-hardening.test.mjs` (lines 8–68)
- Behavioral test: `test/independent-security-verification.test.mjs` (lines 40–118)

### 3. Attack Scenario
An authenticated student refers 10 classmates. Once `v_count >= 10`, the user executes a scripted loop calling `supabase.rpc('process_referral_milestones', { p_referrer_id: my_id })` 1,000 times in parallel. Because the original function lacked an array of awarded tiers and did not lock the row, every request observed `v_count >= 10` and incremented `available_balance := available_balance + 3000`, generating ₦3,000,000 NGN from thin air.

### 4. Actual Control Enforced
1. **Schema Tracking**: Added `referral_milestones_awarded integer[] DEFAULT '{}'` to `public.wallets`.
2. **Pessimistic Concurrency Lock**: Added `SELECT id, available_balance, total_earned, referral_milestones_awarded INTO ... FROM public.wallets WHERE user_id = p_referrer_id FOR UPDATE;`.
3. **Single-Claim Verification**: Evaluated `IF v_milestone_tier >= 10 AND NOT (v_milestone_tier = ANY(v_milestones)) THEN ...` before mutating balances.
4. **Idempotent Tier Appending**: Appended awarded tier via `array_append(v_milestones, v_milestone_tier)` and logged immutable audit trail in `public.wallet_transactions`.

### 5. Test Performed & Quality Assessment
- **Static Test**: Verified migration schema alter and SQL keywords (`FOR UPDATE`, `ANY(...)`).
- **Behavioral Simulation Test**: Tested concurrent execution (3 parallel promises) against single wallet; verified that exactly 1 reward of ₦3,000 was granted and 0 on subsequent attempts.
- **Test Quality**: **High** for logic verification.

### 6. Result: VERIFIED IN SOURCE / PENDING CLOUD MIGRATION
- **Source Code**: **VERIFIED FIXED**.
- **Production Supabase (`gedoyoleoscgxgdqszzc`)**: **PENDING MIGRATION**. Migration `20261020120000_critical_security_audit_hardening.sql` has not been pushed to the live remote database.

### 7. Remaining Risks & Remediation
- **Milestone Jump Defect**: `v_milestone_tier := (v_count / 10)::integer * 10;` only processes the top single milestone tier. If a user refers 25 users before visiting the wallet, they receive ₦3,000 for tier 20, but tier 10 is skipped and permanently lost.
  - *Remediation*: In a future maintenance update, implement a `FOR t IN 10..v_milestone_tier BY 10 LOOP` construct.
- **Production Action**: Apply migration `20261020120000_critical_security_audit_hardening.sql` to remote Supabase prior to release.

---

## Finding B (VULN-CD-002): Android WebView Remote Debugging Enabled

### 1. Original Risk
`"webContentsDebuggingEnabled": true` in `capacitor.config.json` exposed production Android WebViews to `chrome://inspect` via ADB/USB. An attacker or untrusted workstation connecting to a student's phone could dump DOM memory, read Supabase session tokens, extract private chats, or manipulate active user state.

### 2. Files & Artifacts Reviewed
- `capacitor.config.json` (line 6)
- `android/app/src/main/assets/capacitor.config.json` (line 6)
- `android/app/src/main/AndroidManifest.xml` (line 15)
- Physical Release Artifact: `release/TheCollegeDate-2.2.70-vc67-playstore.aab`
- Physical Test APK: `release/TheCollegeDate-2.2.70-vc67-manual-test.apk`

### 3. Attack Scenario
A user charges their device at a public charging kiosk or connects to a shared computer with USB debugging enabled. An automated script detects the package `com.collegedate.app` with an exposed Chrome DevTools protocol port, attaches DevTools, executes `localStorage.getItem('sb-gedoyoleoscgxgdqszzc-auth-token')`, and immediately steals the account session.

### 4. Actual Control Enforced
- In `capacitor.config.json`:
  ```json
  "android": {
    "webContentsDebuggingEnabled": false
  }
  ```
- Synced to `android/app/src/main/assets/capacitor.config.json`.
- `AndroidManifest.xml` does not contain `android:debuggable="true"` in release variant.

### 5. Test Performed & Quality Assessment
- **Static Test**: Tested `JSON.parse('capacitor.config.json').android.webContentsDebuggingEnabled === false`.
- **Adversarial Binary Introspection**: Extracted `base/assets/capacitor.config.json` directly from the pre-existing `release/TheCollegeDate-2.2.70-vc67-playstore.aab` using `tar -xOf`.
- **CRITICAL FORENSIC DISCOVERY**: The pre-existing AAB file on disk was compiled at `12:00 PM on 10/19/2026`, *before* the source fix was made on `10/20/2026`. The physical AAB archive STILL contained `"webContentsDebuggingEnabled": true`!

### 6. Result: FAILED ARTIFACT GATE (Source Verified, Release Binary Stale)
- **Source Code**: **VERIFIED FIXED**.
- **Physical Release Artifact**: **FAILED**. The pre-existing `.aab` on disk was not rebuilt after the code change.

### 7. Remaining Risks & Remediation
- **Critical Remediation**: The current AAB in `release/` must **NEVER** be uploaded to Google Play Console. A fresh release bundle must be assembled via `npm run aab:release` and verified with `tar -xOf release/TheCollegeDate-2.2.70-vc67-playstore.aab base/assets/capacitor.config.json` prior to any release.

---

## Finding C (VULN-CD-003): Global Supabase Client Exposure (`window.__supabase`)

### 1. Original Risk
In `src/lib/supabase.js`, `window.__supabase = supabase` attached the full JavaScript Supabase client to the global `window` object in all environments, giving malicious browser extensions, third-party script tags, or XSS payloads instant access to `window.__supabase.auth.getSession()` and internal query engines.

### 2. Files & Bundles Reviewed
- `src/lib/supabase.js` (lines 14–16)
- Test suite: `test/security-audit-hardening.test.mjs` (lines 82–94)
- Production Vite build output: `dist/assets/index-*.js`

### 3. Attack Scenario
A compromised third-party analytics script or browser extension queries `window.__supabase.auth.getSession()` and transmits the user's access token, refresh token, and user ID to an exfiltration endpoint without needing to inspect storage or network headers.

### 4. Actual Control Enforced
Wrapped the global assignment strictly inside `import.meta.env.DEV`:
```javascript
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__supabase = supabase;
}
```
In Vite production builds (`npm run build`), `import.meta.env.DEV` is statically replaced with `false`, and Rollup tree-shakes the entire assignment block out of the production bundle.

### 5. Test Performed & Quality Assessment
- **Static Test**: Verified regex match in `src/lib/supabase.js`.
- **Build Inspection**: Ran `npm run build` and searched `dist/assets/` for `window.__supabase`. Found 0 occurrences in production chunks.
- **Test Quality**: **High**.

### 6. Result: VERIFIED FIXED
- Both source code and compiled production web assets are clean.

### 7. Remaining Risks & Remediation
- None. Token storage in `localStorage` remains standard for web sessions and is secured against cross-origin scripts via CSP and origin isolation.

---

## Finding D (VULN-CD-004): Admin & Owner Auth Spoofing via Unconfirmed Accounts

### 1. Original Risk
`is_app_admin()`, `admin_is_owner()`, and `admin_has_permission()` matched hardcoded email strings (`godwillgodslife@gmail.com`, etc.) without checking whether `auth.users.email_confirmed_at` was non-null. If an attacker signed up with an owner email before the real owner registered or before confirmation was required, they could immediately obtain full super-admin access.

### 2. Files Reviewed
- `supabase/migrations/20261020120000_critical_security_audit_hardening.sql` (lines 110–260)
- Test suite: `test/security-audit-hardening.test.mjs` (lines 96–108)

### 3. Attack Scenario
An attacker creates a new account on `https://thecollegedate.com/signup` using the email `godwillgodslife@gmail.com`. Even though they do not possess the Gmail inbox, the database creates a row in `auth.users` with `email_confirmed_at = NULL`. When the attacker invokes administrative RPCs (such as `admin_get_user_detail`), `is_app_admin()` previously matched `v_email in (...)` and granted super-admin privileges.

### 4. Actual Control Enforced
Across all three functions (`is_app_admin`, `admin_is_owner`, `admin_has_permission`), verified:
```sql
if v_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com', 'jackreecesokieprim@gmail.com')
   and v_user.email_confirmed_at is not null then
  return true;
end if;
```
And added explicit rejection at function entry:
```sql
if v_user.id is null or v_user.email_confirmed_at is null then
  return false;
end if;
```

### 5. Test Performed & Quality Assessment
- **Static Test**: Verified SQL AST conditions in migration file.
- **Test Quality**: Moderate. (Real database execution test requires remote Supabase apply).

### 6. Result: VERIFIED IN SOURCE / PENDING CLOUD MIGRATION
- **Source Code**: **VERIFIED FIXED**.
- **Production Supabase**: **PENDING MIGRATION**. Must be applied to `gedoyoleoscgxgdqszzc`.

### 7. Remaining Risks & Remediation
- Hardcoded email addresses in SQL functions remain a mild architectural smell, though standard for founder bootstrap accounts. Transitioning to dedicated UUID role assignments in `app_metadata` is recommended long-term.
- Production Action: Apply migration `20261020120000_critical_security_audit_hardening.sql`.

---

## Finding E (VULN-CD-005): Storage Bucket Folder Isolation on `pending-avatars`

### 1. Original Risk
Storage RLS policies on the `pending-avatars` bucket allowed any authenticated user to insert or update files anywhere in the bucket, allowing malicious users to overwrite other users' pending verification selfies or profile pictures.

### 2. Files Reviewed
- `supabase/migrations/20261020120000_critical_security_audit_hardening.sql` (lines 272–315)
- Test suite: `test/security-audit-hardening.test.mjs` (lines 110–116)
- Behavioral test: `test/independent-security-verification.test.mjs` (lines 124–154)

### 3. Attack Scenario
User A uploads a selfie for photo verification. User B monitors storage network requests, observes User A's filename (`pending-avatars/user-a-uuid/selfie.jpg`), and sends an upload request overwriting `user-a-uuid/selfie.jpg` with arbitrary offensive media or another person's face to trigger account suspension or verification bypass.

### 4. Actual Control Enforced
Enforced path-based ownership checks on both INSERT and UPDATE policies in Supabase Storage:
```sql
CREATE POLICY "Users can upload pending avatars to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pending-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update pending avatars in own folder"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'pending-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### 5. Test Performed & Quality Assessment
- **Static Test**: Regex match on migration file.
- **Behavioral Simulation Test**: Evaluated `storage.foldername` extraction across valid paths (`auth.uid()/img.jpg`), invalid target paths (`victim.uid()/img.jpg`), root-level files (`img.jpg`), and directory traversal attempts (`../victim/img.jpg`).
- **Test Quality**: **High**.

### 6. Result: VERIFIED IN SOURCE / PENDING CLOUD MIGRATION
- **Source Code**: **VERIFIED FIXED**.
- **Production Supabase**: **PENDING MIGRATION**. Must be applied to `gedoyoleoscgxgdqszzc`.

### 7. Remaining Risks & Remediation
- File mime-type validation and magic-byte checks at the storage level are not enforced by Supabase Storage RLS alone; client-side image compression (`clientImageCompression.js`) strips EXIF and normalizes to WebP/JPEG before upload, providing strong defense-in-depth.

---

## Finding F (VULN-CD-006): Unauthenticated Preview & Testing Lab Route Protection

### 1. Original Risk
14 internal testing and preview routes (`/ux-lab`, `/push-preview`, `/wireframes`, `/notification-preview`, `/referrals-preview`, etc.) were exposed in `src/App.jsx` without authentication or role guards, allowing search engines, competitors, or curious visitors to discover unreleased features, internal metrics, and mock data.

### 2. Files Reviewed
- `src/App.jsx` (lines 17–38, 250–320)
- Test suite: `test/security-audit-hardening.test.mjs` (lines 118–132)
- Behavioral test: `test/independent-security-verification.test.mjs` (lines 159–198)

### 3. Attack Scenario
An unauthenticated visitor navigates to `https://thecollegedate.com/push-preview` or `/notification-preview` and views confidential internal testing interfaces, UI experiments, and unpublished promotion copy.

### 4. Actual Control Enforced
Created `DevOrAdminRoute` in `src/App.jsx`:
```javascript
function DevOrAdminRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (import.meta.env.DEV) return children;
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  const isAdmin = profile?.is_admin === true || profile?.role === 'admin' || profile?.role === 'owner';
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}
```
Wrapped all 14 internal routes inside `<DevOrAdminRoute><RouteComponent /></DevOrAdminRoute>`.

### 5. Test Performed & Quality Assessment
- **Static Test**: Confirmed all 14 routes are wrapped in `App.jsx`.
- **Behavioral Redirection Test**: Tested 4 states: unauthenticated user -> redirects to `/`; non-admin user -> redirects to `/dashboard`; admin user -> access granted; local dev mode -> access granted.
- **Test Quality**: **High**.

### 6. Result: VERIFIED FIXED
- Enforced on client side and verified across routing tables.

### 7. Remaining Risks & Remediation
- In SPA architectures, client-side route guards prevent rendering, but components are still bundled in JavaScript chunks. Because these components only render mock preview data and call no unauthorized backend APIs, this meets standard industry isolation benchmarks.

---

## Finding G (VULN-CD-007): Self-Gifting Prohibited in Gift RPC

### 1. Original Risk
Users could call `process_gift_purchase` specifying themselves as both the sender and recipient (`p_sender_id = p_receiver_id`), manipulating gift leaderboard statistics, triggering false notification alerts, or exploiting potential wallet credit mismatches.

### 2. Files Reviewed
- `supabase/migrations/20261020120000_critical_security_audit_hardening.sql` (lines 330–385)
- Test suite: `test/security-audit-hardening.test.mjs` (lines 134–139)
- Behavioral test: `test/independent-security-verification.test.mjs` (lines 203–225)

### 3. Attack Scenario
A user with ₦500 wallet balance repeatedly gifts themselves the "Red Rose" virtual gift to artificially pump their profile gift counter and dominate the campus popularity leaderboard.

### 4. Actual Control Enforced
Added defensive precondition to both `process_gift_purchase` function signatures:
```sql
if p_sender_id = p_receiver_id then
  return jsonb_build_object('success', false, 'error', 'Cannot send gifts to yourself');
end if;
```

### 5. Test Performed & Quality Assessment
- **Static Test**: Confirmed SQL assertion.
- **Behavioral Test**: Verified input rejection for identical sender/receiver UUIDs and success for distinct UUIDs.
- **Test Quality**: **High**.

### 6. Result: VERIFIED IN SOURCE / PENDING CLOUD MIGRATION
- **Source Code**: **VERIFIED FIXED**.
- **Production Supabase**: **PENDING MIGRATION**. Must be applied to `gedoyoleoscgxgdqszzc`.

### 7. Remaining Risks & Remediation
- Production Action: Apply migration `20261020120000_critical_security_audit_hardening.sql`.

---

## Finding H (VULN-CD-008): RevenueCat Webhook Timing-Attack Resistance

### 1. Original Risk
In `supabase/functions/revenuecat-webhook/index.ts`, incoming authorization headers were validated using standard JavaScript string equality (`receivedAuth !== expectedAuth`). In theory, byte-by-byte string comparisons terminate early on mismatch, leaking character timing information that could allow an attacker on high-resolution network links to infer the authorization token.

### 2. Files Reviewed
- `supabase/functions/revenuecat-webhook/index.ts` (lines 20–42)
- Test suite: `test/security-audit-hardening.test.mjs` (lines 141–149)
- Behavioral test: `test/independent-security-verification.test.mjs` (lines 10–35)

### 3. Attack Scenario
An attacker sends millions of requests with incremental character guesses to the public webhook endpoint, measuring nano-second timing deltas to reconstruct the shared webhook secret.

### 4. Actual Control Enforced
Implemented XOR-based constant-time string comparison:
```typescript
function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```

### 5. Test Performed & Quality Assessment
- **Behavioral Test**: Tested identical secrets (true), single-character mutations (false), length mismatches (false), null/undefined handling (false without crashing), and object injection (false).
- **Test Quality**: **High**.

### 6. Result: VERIFIED IN SOURCE / PENDING EDGE DEPLOY
- **Source Code**: **VERIFIED FIXED**.
- **Remote Edge Function**: **PENDING DEPLOYMENT**. The remote function on `gedoyoleoscgxgdqszzc` must be redeployed via `supabase functions deploy`.

### 7. Remaining Risks & Remediation
- Note that `a.length !== b.length` returns immediately on length mismatch (leaking token length), which is standard and acceptable in HMAC/bearer token verification when combined with high-entropy keys.
- Production Action: Redeploy edge function with `--no-verify-jwt`.

---

## Finding I (VULN-CD-009): Netlify Security Headers Hardening

### 1. Original Risk
Missing cross-domain policies and cross-origin opener policies left the web application open to cross-origin data leaks, clickjacking via plugins (Flash/Silverlight/PDF), and window-proxy tampering from popup windows. Additionally, manual edits to `public/_headers` were at risk of being wiped by the build-time SEO generator `scripts/generate-netlify-seo.mjs`.

### 2. Files Reviewed
- `public/_headers` (lines 1–15)
- `scripts/generate-netlify-seo.mjs` (lines 80–115)
- Test suite: `test/security-audit-hardening.test.mjs` (lines 151–162)
- Behavioral test: `test/independent-security-verification.test.mjs` (lines 260–269)

### 3. Attack Scenario
A phishing or malicious third-party site opens `https://thecollegedate.com` in a popup or iframe, retains a reference to `window.opener`, and navigates the victim's tab to a credential harvesting site or exploits cross-domain media embeddings.

### 4. Actual Control Enforced
1. Updated `public/_headers` with:
   - `X-Permitted-Cross-Domain-Policies: none`
   - `Cross-Origin-Opener-Policy: same-origin-allow-popups`
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
2. **Synchronized Generator**: Updated `scripts/generate-netlify-seo.mjs` to ensure subsequent automated prebuilds (`npm run prebuild`) do not overwrite or strip these security headers.

### 5. Test Performed & Quality Assessment
- **Static Test**: Verified headers in `public/_headers`.
- **Idempotency Test**: Verified that `scripts/generate-netlify-seo.mjs` writes all required security headers into the Netlify headers output template.
- **Test Quality**: **High**.

### 6. Result: VERIFIED FIXED
- Enforced in both static configuration and build-time generator scripts.

### 7. Remaining Risks & Remediation
- CSP (Content Security Policy) is currently permissive regarding Agora and OneSignal CDNs; further tightening with specific script hashes is recommended for future hardening.

---

## Finding J (VULN-CD-010): Test Suite Reliability & Release Gate Claims

### 1. Original Risk
The prior report claimed that 349 tests passed, the production build succeeded, and the application was ready for release. However, static tests alone could pass while physical artifacts or cloud systems remained out of sync.

### 2. Files & Systems Reviewed
- Entire test suite: `npm run test:all` (359 tests across 4 suites)
- Vite production build: `npm run build`
- Physical AAB package: `release/TheCollegeDate-2.2.70-vc67-playstore.aab`
- Remote database state on Supabase `gedoyoleoscgxgdqszzc`

### 3. Independent Findings
1. **Automated Suite**: Fully verified. 359/359 automated tests execute cleanly in 20.9s with 0 regressions.
2. **Build Pipeline**: Fully verified. `npm run build` succeeds cleanly in 24s across 1,159 modules.
3. **Artifact Integrity**: **FAILED**. The pre-existing AAB binary in `release/` still contains `"webContentsDebuggingEnabled": true`.
4. **Cloud Database State**: **PENDING**. Migration `20261020120000_critical_security_audit_hardening.sql` is pending on hosted Supabase.

### 4. Result: CONDITIONAL RELEASE (HOLD)
- While the engineering team solved all 10 issues at the code level, **the release gates for artifact assembly and database migration have not been fulfilled**.
