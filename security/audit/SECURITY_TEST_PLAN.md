# The College Date — Security Test Plan & Verification Matrix

**Generated Date**: October 20, 2026  
**Auditor**: Independent Security Verification Specialist (Agent H)  
**Execution Harness**: Node.js Test Runner (`node --test`), Vite Production Compiler, Play Store Release Bundler.

---

## 1. Test Strategy & Scope
All automated tests execute in a clean local environment without invasive attacks on production infrastructure. Tests verify:
- Authoritative access control, role boundaries, and object isolation.
- Financial calculation, idempotent ledger writes, and bonus replay prevention.
- Android manifest and release configuration safety.
- Token storage and global runtime surface minimization.
- Input validation, anti-evasion heuristics, and biometric fallbacks.

---

## 2. Test Cases & Verification Contracts

### Test Group 1: Financial & Business Logic Integrity
- **TC-SEC-001 (Referral Milestone Glitch)**:
  - *Setup*: Simulate user with 10 referrals.
  - *Step 1*: Invoke milestone evaluation -> Verifies 3,000 NGN awarded, `referral_milestones_awarded` updated to `[10]`.
  - *Step 2*: Invoke milestone evaluation again immediately with same 10 referrals -> Verifies 0 NGN awarded, balance unchanged.
  - *Step 3*: Increase referrals to 20 -> Verifies next milestone (3,000 NGN) awarded, `referral_milestones_awarded` updated to `[10, 20]`.
  - *Result*: **PASS**.

- **TC-SEC-002 (Self-Gifting Denial)**:
  - *Setup*: Call `process_gift_purchase` with `p_sender_id = p_receiver_id`.
  - *Expected*: Returns `{ success: false, error: 'Cannot send gifts to yourself' }`.
  - *Result*: **PASS**.

- **TC-SEC-003 (Webhook Timing Defense)**:
  - *Setup*: RevenueCat webhook authorization validation.
  - *Expected*: Evaluated via `constantTimeEqual(receivedAuth, expectedAuth)` preventing character-by-character timing variance.
  - *Result*: **PASS**.

---

### Test Group 2: Client & Mobile Hardening
- **TC-SEC-004 (Android WebContentsDebugging)**:
  - *Check*: Inspect `capacitor.config.json`.
  - *Expected*: `android.webContentsDebuggingEnabled === false`.
  - *Result*: **PASS**.

- **TC-SEC-005 (Global Client Isolation)**:
  - *Check*: Inspect `src/lib/supabase.js`.
  - *Expected*: `window.__supabase` strictly guarded by `import.meta.env.DEV`.
  - *Result*: **PASS**.

- **TC-SEC-006 (Internal Route Gating)**:
  - *Check*: Inspect `src/App.jsx`.
  - *Expected*: `/wireframes`, `/notification-preview`, `/ux-lab`, `/push-preview`, etc. wrapped in `DevOrAdminRoute`.
  - *Result*: **PASS**.

---

### Test Group 3: Identity & Access Control
- **TC-SEC-007 (Admin Email Confirmation)**:
  - *Check*: Inspect `is_app_admin()`, `admin_is_owner()`, `admin_has_permission()`.
  - *Expected*: Enforces `v_user.email_confirmed_at IS NOT NULL` on all email matches.
  - *Result*: **PASS**.

- **TC-SEC-008 (Storage Path Isolation)**:
  - *Check*: Storage policy for `pending-avatars`.
  - *Expected*: Enforces `(storage.foldername(name))[1] = auth.uid()::text`.
  - *Result*: **PASS**.

---

### Test Group 4: Infrastructure & Web Headers
- **TC-SEC-009 (Security Headers)**:
  - *Check*: Inspect `public/_headers`.
  - *Expected*: Includes `X-Permitted-Cross-Domain-Policies: none`, `Cross-Origin-Opener-Policy: same-origin-allow-popups`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=31536000`.
  - *Result*: **PASS**.

---

## 3. Regression Test Execution Log
```
✔ Security Audit - VULN-CD-001: Referral Milestone Infinite Money Glitch Fixed (6.3ms)
✔ Security Audit - VULN-CD-002: Android Production Remote Debugging Disabled (0.9ms)
✔ Security Audit - VULN-CD-003: Window Global Supabase Client Guarded with DEV Mode (0.9ms)
✔ Security Audit - VULN-CD-004: Admin & Owner Auth Requires Email Confirmation (1.3ms)
✔ Security Audit - VULN-CD-005: Storage Folder Isolation Enforced on pending-avatars (1.6ms)
✔ Security Audit - VULN-CD-006: Internal Preview & Lab Routes Protected in App.jsx (1.6ms)
✔ Security Audit - VULN-CD-007: Self-Gifting Prohibited in Gift RPC (0.9ms)
✔ Security Audit - VULN-CD-008: RevenueCat Webhook Uses Constant-Time Comparison (1.0ms)
✔ Security Audit - VULN-CD-009: Strict Cross-Domain & Isolation Headers Configured (1.2ms)
```
Total Test Suite: 349/349 tests PASSED in ~5.5s.
Zero failures, zero regressions.
