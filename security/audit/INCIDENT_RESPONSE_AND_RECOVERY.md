# The College Date — Incident Response, Breach & Recovery Procedures

**Generated Date**: October 20, 2026  
**Auditor**: Security Operations & Incident Commander  
**Scope**: Account Compromise, Credential Exposure, Payment Fraud, and Disaster Recovery

---

## 1. Incident Severity Classification

| Tier | Name | Criteria | Target SLA |
| :---: | :--- | :--- | :---: |
| **SEV-0** | **Catastrophic** | Live database compromise, active financial drain, production key leak, service outage | **Immediate (< 15 mins)** |
| **SEV-1** | **Critical** | Single account takeover of administrator, RLS policy bypass, webhook failure | **< 1 hour** |
| **SEV-2** | **Major** | Elevation of privilege without data loss, non-critical DoS, rate-limit failure | **< 4 hours** |
| **SEV-3** | **Minor** | Bug report with security implications, isolated failed validation | **< 24 hours** |

---

## 2. Playbooks

### 2.1 Playbook A: Supabase Service Role Key or Third-Party API Key Exposure
1. **Identification**: Alert received from Git secret scanner or security researcher.
2. **Containment**:
   - Do NOT delete the key immediately if production traffic depends on it.
   - Generate a secondary key in the provider console (Supabase / Paystack / OpenRouter / RevenueCat).
   - Deploy the new secret into Netlify / Supabase Edge Functions environment variables (`SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH`).
   - Trigger zero-downtime redeploy of Edge Functions (`supabase functions deploy`).
   - Revoke and delete the compromised key in provider dashboard.
3. **Investigation**:
   - Query `public.admin_audit_logs` and PostgreSQL `pg_stat_statements` for unexpected IP addresses, queries, or bulk exports.
   - Check `provider_webhook_events` for forged transactions.
4. **Post-Incident**: Document root cause, commit SHA, and update pre-commit hooks and `.gitignore`.

---

### 2.2 Playbook B: Administrator Account Takeover
1. **Containment**:
   - Access Supabase Auth Dashboard or execute emergency SQL via management pooler:
     ```sql
     UPDATE auth.users
     SET raw_app_meta_data = raw_app_meta_data - 'is_admin' - 'role' - 'admin_permissions'
     WHERE id = '<compromised_user_id>';
     ```
   - Invalidate active JWT sessions by rotating user's JWT secret or invoking `auth.admin.signOut('<compromised_user_id>', 'global')`.
2. **Investigation**:
   - Review `public.admin_audit_logs` for all actions taken by `<compromised_user_id>` over the preceding 72 hours.
   - Revert any unauthorized user bans, promotions, config modifications, or withdrawal approvals.
3. **Recovery**:
   - Require password reset and multi-factor re-authentication.

---

### 2.3 Playbook C: Suspected Financial Fraud or Referral Exploitation
1. **Containment**:
   - Query users with abnormally high referral bonuses:
     ```sql
     SELECT user_id, count(*), sum(amount)
     FROM public.wallet_transactions
     WHERE type = 'referral_milestone_bonus'
     GROUP BY user_id
     HAVING count(*) > 5;
     ```
   - Place temporary withdrawal lock on suspicious wallets:
     ```sql
     UPDATE public.wallets
     SET available_balance = 0, pending_balance = available_balance
     WHERE user_id = '<suspect_id>';
     ```
2. **Investigation**:
   - Correlate referral accounts against IP addresses, device IDs, and creation timestamps to identify bot farms.
3. **Remediation**:
   - Ban bot accounts (`admin_set_user_status`).
   - Reconcile legitimate ledger balance.

---

## 3. Database Recovery & Rollback Protocol

### 3.1 Point-in-Time Recovery (PITR)
- Supabase hosted project `gedoyoleoscgxgdqszzc` maintains physical WAL backups.
- In case of catastrophic table truncation or destructive modification:
  1. Open Supabase Dashboard -> Database -> Backups.
  2. Select Point-in-Time Restore to a minute immediately preceding the incident.
  3. Spin up restored instance to staging, verify table integrity, and export necessary deltas.

### 3.2 SQL Migration Rollback
- To roll back migration `20261020120000_critical_security_audit_hardening.sql`:
  - Execute previous versions of functions (`is_app_admin`, `admin_is_owner`, `process_referral_milestones`) from migration `20260913160000_grant_cofounder_admin_jackreecesokieprim.sql` and `20260523124500_money_rpc_auth_guards.sql`.
  - Column `wallets.referral_milestones_awarded` is purely additive and does not break existing queries.
