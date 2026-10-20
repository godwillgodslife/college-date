# Prioritized Security Remediation Plan

**Ecosystem**: The College Date (Web, Android, Supabase Cloud)  
**Evaluated Version**: `v2.2.70` (Android VC 67)  
**Planning Horizon**: Immediate (Pre-Release) | Near-Term (Sprint 1) | Strategic (Quarterly)

---

## Tier 1: Immediate Pre-Release Blockers (Mandatory Before Production)

These actions are strictly required before approving release of `v2.2.70` (VC 67) to end users.

### Action 1.1: Re-Assemble and Verify Physical Android Release Bundle (AAB)
- **Problem**: The pre-existing AAB package in `release/` still embeds `"webContentsDebuggingEnabled": true`.
- **Action**: Run the complete release pipeline:
  ```powershell
  npm run aab:release
  ```
- **Verification**:
  ```powershell
  tar -xOf release/TheCollegeDate-2.2.70-vc67-playstore.aab base/assets/capacitor.config.json
  ```
  *Ensure output displays `"webContentsDebuggingEnabled": false`.*
- **Estimated Duration**: 3–5 minutes.
- **Risk Level**: None (Offline local build).

### Action 1.2: Apply Security Hardening Migration to Hosted Supabase
- **Problem**: Hosted Supabase project `gedoyoleoscgxgdqszzc` is missing migration `20261020120000_critical_security_audit_hardening.sql`.
- **Action**: Apply via Supabase CLI or SQL dashboard:
  ```powershell
  npx supabase db push --project-ref gedoyoleoscgxgdqszzc
  ```
- **Verification**:
  Execute SQL query in Supabase SQL editor:
  ```sql
  SELECT proname, prosrc FROM pg_proc WHERE proname = 'process_referral_milestones';
  ```
  *Verify `referral_milestones_awarded` and `FOR UPDATE` are present in function body.*
- **Estimated Duration**: 2 minutes.
- **Risk Level**: Low (Pessimistic locking and additive columns; no table drops or breaking changes).

### Action 1.3: Deploy Updated RevenueCat Webhook Edge Function
- **Problem**: Remote edge function does not include XOR-based constant-time signature comparison.
- **Action**:
  ```powershell
  npx supabase functions deploy revenuecat-webhook --project-ref gedoyoleoscgxgdqszzc --no-verify-jwt
  ```
- **Verification**:
  Trigger a test webhook with mismatched header length and inspect Supabase Edge Function logs.
- **Estimated Duration**: 1 minute.
- **Risk Level**: None.

### Action 1.4: Deploy Web Application to Netlify Production
- **Problem**: Live web bundle at `thecollegedate.com` must reflect route guards and stripped global variables.
- **Action**:
  ```powershell
  git push origin master
  ```
  *(Or execute `netlify deploy --prod --dir=dist`)*
- **Verification**:
  - Check HTTP response headers: `curl -I https://thecollegedate.com`
  - In browser console on production, verify `window.__supabase === undefined`.
- **Estimated Duration**: 2 minutes.
- **Risk Level**: None.

---

## Tier 2: Near-Term Remediation (Next Maintenance Patch / v2.2.71)

These items address edge-case accounting gaps and defense-in-depth improvements discovered during the audit.

### Action 2.1: Implement Multi-Tier Referral Catch-Up Loop
- **Problem**: When a user jumps directly across multiple tiers (e.g. 0 to 25 referrals) before calling `process_referral_milestones`, `v_milestone_tier` calculates `20`, skipping tier `10` permanently.
- **Remediation**: In `supabase/migrations/`:
  ```sql
  -- Loop through all eligible tiers up to current count
  FOR t IN 10..v_milestone_tier BY 10 LOOP
    IF NOT (t = ANY(v_milestones)) THEN
      v_reward := v_reward + 3000;
      v_milestones := array_append(v_milestones, t);
    END IF;
  END LOOP;
  ```
- **Target**: Release `v2.2.71`.

### Action 2.2: Migrate Admin Permissions from Hardcoded Emails to UUID Roles
- **Problem**: Hardcoding owner emails in SQL functions (`godwillgodslife@gmail.com`) creates maintenance overhead if founders change email addresses.
- **Remediation**: Use Supabase `auth.users.raw_app_meta_data->>'role' = 'super_admin'` or dedicated `admin_users` table with foreign key to `auth.users(id)`.
- **Target**: Sprint 2.

### Action 2.3: Tighten Content-Security-Policy (CSP)
- **Problem**: Netlify headers permit generic external CDN script origins for Agora and OneSignal.
- **Remediation**: Generate cryptographic subresource integrity (SRI) hashes or nonce-based CSP for all external scripts.
- **Target**: Sprint 2.

---

## Tier 3: Strategic Long-Term Architecture

1. **Automated Release Gate Pipeline**: Add a pre-commit or CI/CD step that extracts and verifies `capacitor.config.json` inside generated `.aab` artifacts automatically.
2. **Database Migration Verification Hook**: Implement an automated GitHub Action that queries the remote Supabase `schema_migrations` table before allowing production deployments.
3. **Continuous Secret Scanning**: Enforce automated pre-receive git hooks (e.g. `gitleaks`) to prevent local secrets or test tokens from entering git history.
