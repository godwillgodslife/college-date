# Confirmed Findings & Technical Defects Register

**Project**: The College Date  
**Audit Type**: Independent Adversarial Verification  
**Status**: ACTIVE AUDIT FINDINGS

---

## DEFECT-CD-001 (CRITICAL): Stale Physical Release AAB Package Contains Remote WebView Debugging

### Severity
**CRITICAL / RELEASE BLOCKING**

### Affected Asset
`release/TheCollegeDate-2.2.70-vc67-playstore.aab` (SHA-256: `8FC629ECD5202C22F2E39B73854F68E77E8CA2D306C2CA95DDB3B70F6D035E1B`)

### Forensic Evidence
Decompilation and inspection of the pre-existing AAB bundle using `tar -xOf release/TheCollegeDate-2.2.70-vc67-playstore.aab base/assets/capacitor.config.json` extracted the following configuration:
```json
{
  "appId": "com.collegedate.app",
  "appName": "The College Date",
  "webDir": "dist",
  "android": {
    "webContentsDebuggingEnabled": true
  }
}
```

### Technical Root Cause
The release artifact on disk was compiled at `12:00 PM on 10/19/2026` during the Ultra Premium release cycle. The security remediation that changed `webContentsDebuggingEnabled` from `true` to `false` was committed locally on `10/20/2026`. Because a clean Gradle bundle command was not executed after the source change, the physical `.aab` package was never rebuilt.

### Security Impact
If this artifact is submitted to the Google Play Console for production rollout, any device running the release app with USB debugging enabled will expose the Chrome DevTools protocol. An attacker or shared computer can inspect the DOM, extract access tokens, execute arbitrary JavaScript in the application context, and dump chat history.

### Remediation
1. Delete or quarantine `release/TheCollegeDate-2.2.70-vc67-playstore.aab`.
2. Run `npm run aab:release` to clean Android assets, synchronize Capacitor, and assemble a new release bundle via `./gradlew bundleRelease`.
3. Verify the new bundle using `tar -xOf release/TheCollegeDate-2.2.70-vc67-playstore.aab base/assets/capacitor.config.json` to confirm `"webContentsDebuggingEnabled": false`.

---

## DEFECT-CD-002 (HIGH): Production Cloud Database Lacks Security Audit Hardening Migration

### Severity
**HIGH / RELEASE BLOCKING**

### Affected Asset
Hosted Supabase Database (`gedoyoleoscgxgdqszzc.supabase.co`)

### Technical Details
Migration file `supabase/migrations/20261020120000_critical_security_audit_hardening.sql` is present in the local Git repository as the 94th migration. However, inspection reveals that it has not yet been applied to the live hosted Supabase instance.

### Live Production Vulnerabilities Due to Missing Migration
1. **Referral Milestone Money Glitch**: The remote database is still running the unhardened version of `public.process_referral_milestones`, which lacks the `FOR UPDATE` lock and does not check `referral_milestones_awarded`. Users can multiply wallet balances by invoking the RPC repeatedly.
2. **Admin Spoofing via Unconfirmed Email**: `is_app_admin()` and `admin_is_owner()` on remote do not check `email_confirmed_at IS NOT NULL`.
3. **Storage Bucket Folder Hijacking**: RLS policies on `pending-avatars` on remote do not restrict uploads to `auth.uid()`.
4. **Self-Gifting RPC Abuse**: Remote `process_gift_purchase` does not reject `p_sender_id = p_receiver_id`.

### Remediation
Obtain operator authorization to apply migration `20261020120000_critical_security_audit_hardening.sql` to hosted Supabase (`gedoyoleoscgxgdqszzc`) using the Supabase CLI (`npx supabase db push`) or the Supabase SQL Editor.

---

## DEFECT-CD-003 (MEDIUM): RevenueCat Webhook Edge Function Deployment Lag

### Severity
**MEDIUM / DEPLOYMENT BLOCKING**

### Affected Asset
Supabase Edge Function: `revenuecat-webhook` on `gedoyoleoscgxgdqszzc`

### Technical Details
The source code in `supabase/functions/revenuecat-webhook/index.ts` was updated with the `constantTimeEqual` function to mitigate timing attacks. However, edge functions require explicit deployment to the Supabase cloud infrastructure. The remote active function version is currently running the prior deployment (v22).

### Security Impact
The live edge function remains marginally vulnerable to character-by-character timing inference under lab conditions with microsecond network latency.

### Remediation
Deploy the updated edge function to hosted Supabase:
```powershell
npx supabase functions deploy revenuecat-webhook --project-ref gedoyoleoscgxgdqszzc --no-verify-jwt
```

---

## DEFECT-CD-004 (LOW): Referral Milestone Calculation Tier Jump Omission

### Severity
**LOW / ACCOUNTING INTEGRITY**

### Affected Asset
`supabase/migrations/20261020120000_critical_security_audit_hardening.sql` (lines 40–55)

### Technical Details
In `process_referral_milestones`:
```sql
v_milestone_tier := (v_count / 10)::integer * 10;
if v_milestone_tier >= 10 and not (v_milestone_tier = any(v_milestones)) then
  v_reward := 3000;
  ...
  update public.wallets
  set available_balance = available_balance + v_reward,
      total_earned = total_earned + v_reward,
      referral_milestones_awarded = array_append(v_milestones, v_milestone_tier)
  where id = v_wallet_id;
end if;
```
If a student refers 25 classmates before their wallet processes the milestone, `v_milestone_tier` is calculated as `20`. The function records `20` in `referral_milestones_awarded` and credits ₦3,000 NGN. However, tier `10` was never processed. If the user later reaches 30 referrals, `30` is awarded, meaning tier `10` is skipped and cannot be claimed retroactively.

### Remediation
Update the milestone calculation loop in a future maintenance patch to iterate over all unawarded tiers:
```sql
for t in 10..v_milestone_tier by 10 loop
  if not (t = any(v_milestones)) then
    v_reward := v_reward + 3000;
    v_milestones := array_append(v_milestones, t);
  end if;
end loop;
```

---

## DEFECT-CD-005 (LOW): Static Test Suite Assertion Fragility

### Severity
**LOW / TEST QUALITY**

### Affected Asset
`test/security-audit-hardening.test.mjs`

### Technical Details
The original test suite relied primarily on static regular expressions scanning SQL migration text (e.g. `assert.match(migrationContent, /for\s+update/i)`). In one instance (line 107), a regex checked `admin_has_permission[\s\S]*?v_user\.email_confirmed_at\s+is\s+null`, which passed only because the SQL contained an error guard `if ... v_user.email_confirmed_at is null then return false`.

### Remediation
Introduced `test/independent-security-verification.test.mjs`, which runs true behavioral simulations:
1. Concurrency racing (multiple asynchronous calls contending for a single wallet lock).
2. Input mutation testing on `constantTimeEqual` (length mismatch, nulls, undefined, objects).
3. Storage path traversal simulation.
4. Route redirection logic testing across unauthenticated, student, and admin states.
5. Automated physical inspection of `.aab` archives on disk.
