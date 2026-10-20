# Production Deployment Gaps & Synchronization Matrix

**Evaluation Target**: Release Candidate `v2.2.70` (Android VC 67)  
**Hosted Supabase Reference**: `gedoyoleoscgxgdqszzc`  
**Web Production Target**: Netlify (`collegedate4` / `https://www.thecollegedate.com`)  
**Android Distribution Target**: Google Play Console (`com.collegedate.app`)

---

## 1. Summary of Gaps Between Source and Production

While the local repository contains complete source code and migration scripts addressing all 10 security findings, **none of these controls are currently active in live production systems**.

```
LOCAL REPOSITORY (Audited & Hardened)
├── capacitor.config.json                  [webContentsDebuggingEnabled: false]
├── src/lib/supabase.js                    [window.__supabase guarded DEV-only]
├── src/App.jsx                            [DevOrAdminRoute wraps internal routes]
├── 20261020120000_critical_security.sql   [Pessimistic locking, RLS, auth checks]
└── revenuecat-webhook/index.ts            [constantTimeEqual timing resistance]
                             │
                             ▼  DEPLOYMENT GAPS IDENTIFIED
                             │
CLOUD / RELEASE TARGETS (Current Live State)
├── Physical AAB (release/*.aab)           ❌ CONTAINS webContentsDebuggingEnabled: true
├── Hosted Supabase (gedoyoleoscgxgdqszzc)  ❌ MISSING migration 20261020120000
├── Edge Function (revenuecat-webhook)     ❌ RUNNING prior version (v22, standard ==)
└── Netlify Production (thecollegedate.com) ⚠️ PENDING atomic deploy of hardened bundle
```

---

## 2. Detailed Asset Gap Analysis

### Gap 1: Physical Google Play App Bundle (AAB) Stale Binary
- **Current File**: `release/TheCollegeDate-2.2.70-vc67-playstore.aab`
- **File Timestamp**: `10/19/2026 12:00 PM`
- **Internal Reality**: `base/assets/capacitor.config.json` inside the archive has `"webContentsDebuggingEnabled": true`.
- **Status**: **FAILED**. Cannot be deployed to Google Play Console.
- **Resolution**: Execute `npm run aab:release` to build a clean release bundle from updated assets.

### Gap 2: Hosted Supabase Database Schema & Logic
- **Target Instance**: `gedoyoleoscgxgdqszzc.supabase.co`
- **Local Migration**: `supabase/migrations/20261020120000_critical_security_audit_hardening.sql`
- **Status in Production**: **NOT APPLIED**.
- **Impact in Production**:
  - Live users with >= 10 referrals can still exploit the milestone race condition to generate unauthorized wallet funds.
  - Accounts with unconfirmed emails could potentially match founder emails in `is_app_admin()`.
  - Storage bucket `pending-avatars` allows authenticated users to overwrite files outside their UID.
  - Users can purchase virtual gifts where sender equals receiver.
- **Resolution**: Operator must apply `20261020120000_critical_security_audit_hardening.sql` via Supabase CLI or SQL dashboard.

### Gap 3: Remote Supabase Edge Function (`revenuecat-webhook`)
- **Target Function**: `revenuecat-webhook` on `gedoyoleoscgxgdqszzc`
- **Local Implementation**: Implements `constantTimeEqual(receivedAuth, expectedAuth)`
- **Remote Version**: Currently version 22 (deployed 10/19/2026 without constant-time logic).
- **Status in Production**: **NOT DEPLOYED**.
- **Resolution**: Deploy function with `supabase functions deploy revenuecat-webhook --project-ref gedoyoleoscgxgdqszzc --no-verify-jwt`.

### Gap 4: Netlify Production Web Deployment
- **Target Site**: `thecollegedate.com`
- **Current Live Build**: Running earlier deployment.
- **Local Implementation**: Production build in `dist/` contains route guards, stripped `window.__supabase`, and updated `_headers`.
- **Status in Production**: **PENDING DEPLOY**.
- **Resolution**: Deploy via Netlify CLI or push to production branch triggering Netlify CI/CD.

---

## 3. Verification Boundaries: What is Verified vs What Cannot Be Verified

| Verification Dimension | Source Level (Verified) | Build Level (Verified) | Production Level (Unverified / Blocked) |
| :--- | :--- | :--- | :--- |
| **Referral Milestone Concurrency** | Source code logic verified via simulation. | N/A | **Unverified in production** (live DB lacks migration). |
| **Android WebView Debugging** | Source config verified (`false`). | Stale AAB caught (`true`). | **Blocked** until fresh AAB is built. |
| **Window Global Supabase Exposure** | Source code verified (`DEV` guard). | Verified (0 hits in `dist/`). | **Verified** once bundle deployed. |
| **Admin Email Confirmation** | Source SQL verified. | N/A | **Unverified in production** (live DB lacks migration). |
| **Storage Bucket Isolation** | SQL RLS verified. | N/A | **Unverified in production** (live DB lacks migration). |
| **Preview Route Guarding** | Route wrappers verified. | Build passes cleanly. | **Verified** once bundle deployed. |
| **Self-Gifting Denial** | Source SQL verified. | N/A | **Unverified in production** (live DB lacks migration). |
| **Webhook Constant-Time Comparison** | TypeScript code verified. | N/A | **Unverified in production** (edge function not deployed). |
| **Netlify Security Headers** | Headers and generator verified. | Verified in `dist/`. | **Verified** once bundle deployed. |

---

## 4. Operational Runbook to Close All Deployment Gaps

To transition the ecosystem from **CONDITIONAL RELEASE (HOLD)** to **READY FOR CONTROLLED RELEASE**, execute the following steps in sequence:

### Step 1: Rebuild Android Release Artifact (Offline / Safe)
```powershell
npm run aab:release
```
After the command completes, verify the artifact:
```powershell
node scripts/verify-aab.mjs
tar -xOf release/TheCollegeDate-2.2.70-vc67-playstore.aab base/assets/capacitor.config.json
```
Ensure `"webContentsDebuggingEnabled": false` is present in the output.

### Step 2: Apply Database Migration to Hosted Supabase (Requires Authorization)
Authenticate with Supabase CLI and apply the migration:
```powershell
npx supabase db push --project-ref gedoyoleoscgxgdqszzc
```
*Alternatively, paste the contents of `supabase/migrations/20261020120000_critical_security_audit_hardening.sql` into the Supabase Dashboard SQL Editor for project `gedoyoleoscgxgdqszzc` and execute.*

### Step 3: Deploy RevenueCat Webhook Edge Function
```powershell
npx supabase functions deploy revenuecat-webhook --project-ref gedoyoleoscgxgdqszzc --no-verify-jwt
```

### Step 4: Deploy Web Application to Netlify Production
Commit local changes and push to `master` (or trigger Netlify deploy):
```powershell
git add .
git commit -m "fix(security): apply critical security audit hardening and verified release gates"
git push origin master
```
Verify live headers on `https://thecollegedate.com` using `curl -I https://thecollegedate.com`.
