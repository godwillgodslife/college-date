# The College Date — Security Release & Deployment Checklist

**Generated Date**: October 20, 2026  
**Target Release**: Production Web (`thecollegedate.com`) & Android Release Bundle  

---

## 1. Objective Go / No-Go Verification Gates

| Gate # | Verification Gate Description | Status | Evidence / Verification Method |
| :---: | :--- | :---: | :--- |
| **G1** | **No High or Critical Open Vulnerabilities** | **PASS** | VULN-CD-001 through VULN-CD-009 remediated and verified. |
| **G2** | **Full Automated Regression Test Suite** | **PASS** | 349/349 tests passing in 4.54s (`npm run test:all`). |
| **G3** | **Production Code Secrets Isolation** | **PASS** | Zero privileged tokens or private keys in git or client bundles. |
| **G4** | **Android Release Remote Debugging Disabled** | **PASS** | `webContentsDebuggingEnabled === false` verified in `capacitor.config.json`. |
| **G5** | **Window Global Supabase Client Stripped** | **PASS** | Guarded by `import.meta.env.DEV` in `src/lib/supabase.js`. |
| **G6** | **Internal Dev/Lab Routes Protected** | **PASS** | Guarded by `DevOrAdminRoute` in `src/App.jsx`. |
| **G7** | **Authoritative Financial Logic & Idempotency** | **PASS** | `process_referral_milestones` rewritten with single-claim tracking. |
| **G8** | **Authoritative Admin Email Confirmation** | **PASS** | `is_app_admin()` enforces `v_user.email_confirmed_at IS NOT NULL`. |
| **G9** | **Storage Bucket Folder Isolation** | **PASS** | `pending-avatars` RLS enforces `auth.uid() = (storage.foldername(name))[1]`. |
| **G10** | **Production Vite Build & Bundle Verification** | **PASS** | Vite production compile passes with zero module or syntax errors. |

---

## 2. Production Deployment Steps

### Step 1: Database Migration Application
Execute additive migration `supabase/migrations/20261020120000_critical_security_audit_hardening.sql` on remote Supabase project `gedoyoleoscgxgdqszzc`:
```bash
npx supabase db push
```
*(Zero downtime; fully backward-compatible with active client versions).*

### Step 2: Supabase Edge Functions Deployment
Deploy updated `revenuecat-webhook` Edge Function:
```bash
npx supabase functions deploy revenuecat-webhook --no-verify-jwt
```

### Step 3: Web Build & Netlify Production Deployment
```bash
npm run build
npx netlify deploy --prod --dir=dist
```

### Step 4: Android App Bundle Assembly & Verification
```bash
npm run aab:release
```
Verifies all 9 Play Store release verification gates (`node scripts/verify-aab.mjs`).

---

## 3. Post-Deployment Smoke Test Protocol
1. **Authentication**: Test login with confirmed student account; confirm JWT session persists in SecureStorage on Android and localStorage on Web.
2. **Referral Reward**: Test `apply_referral_code`; confirm non-admin user cannot invoke `process_referral_milestones` for another user ID, and cannot double-claim milestone tier.
3. **Admin Surface**: Confirm unconfirmed user accounts cannot access `/admin` or invoke admin RPCs.
4. **Android Inspection**: Attach Chrome DevTools (`chrome://inspect`) to Android release build on device; confirm WebView does NOT appear in inspectable targets.
5. **Private Storage**: Confirm file uploaded to `pending-avatars` cannot overwrite another user's path.
