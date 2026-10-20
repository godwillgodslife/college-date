# The College Date — Supabase & Database Security Audit

**Generated Date**: October 20, 2026  
**Auditor**: Database Security Engineer & Red Team Reviewer  
**Scope**: PostgreSQL Schemas (`public`, `private`, `storage`, `auth`), RLS Policies, Functions, Triggers, Grants, and Realtime Publications.

---

## 1. Executive Summary: Database Posture
The database architecture uses PostgreSQL Row-Level Security (RLS) across all sensitive application tables. Core transactional mutations (sending messages, purchasing gifts, applying referral codes, withdrawing funds) are encapsulated inside `SECURITY DEFINER` RPC functions with explicit schema search path isolation (`SET search_path TO ''` or `SET search_path = public`).

---

## 2. Table Access Control & RLS Matrix

| Table Name | RLS Enabled | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy | Risk Evaluation |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `profiles` | YES | Authenticated: any active unbanned profile | Authenticated: own profile only (`id = auth.uid()`) | Authenticated: own profile only (protected via `trg_protect_profile_trust_badges`) | Service Role Only | **SECURE** |
| `matches` | YES | Authenticated: user1 or user2 participant | System / Service Role Only | System / Service Role Only | System / Service Role Only | **SECURE** |
| `messages` | YES | Authenticated: match participant only (excluding `deleted_for`) | Authenticated: match participant via RPC `send_native_text_message` | Authenticated: sender edit via RPC `edit_chat_message` | Authenticated: participant delete via RPC `delete_chat_message` | **SECURE** |
| `wallets` | YES | Authenticated: owner only (`user_id = auth.uid()`) | Revoked from client (Trigger / RPC only) | Revoked from client (RPC only) | Revoked from client | **SECURE** |
| `wallet_transactions` | YES | Authenticated: owner only (`user_id = auth.uid()`) | Revoked from client | Revoked from client | Revoked from client | **SECURE** |
| `wallet_ledger` | YES | Authenticated: owner only (`user_id = auth.uid()`) | Revoked from client | Revoked from client | Revoked from client | **SECURE** |
| `subscriptions` | YES | Authenticated: owner only (`user_id = auth.uid()`) | Service Role / Webhook only | Service Role / Webhook only | Service Role only | **SECURE** |
| `confessions` | YES | Authenticated / Public active approved only | Authenticated: own user id (`user_id = auth.uid()`) | Owner / Admin only | Owner / Admin only | **SECURE** |
| `confession_reports` | YES | Authenticated: reporter only | Authenticated: own reporter id | Admin only | Admin only | **SECURE** |
| `user_reports` | YES | Admin only | Authenticated: reporter only | Admin only | Admin only | **SECURE** |
| `referrals` | YES | Authenticated: referrer or referred only | RPC `apply_referral_code` only | RPC / System only | Revoked from client | **SECURE** |

---

## 3. Function & RPC Privilege Review

### 3.1 Search Path Isolation
All `SECURITY DEFINER` functions in the baseline and migrations enforce:
```sql
SECURITY DEFINER
SET search_path TO ''
```
or explicit schemas (`SET search_path = public, extensions, pg_catalog`), preventing search_path hijacking attacks (CWE-426).

### 3.2 Referral Milestone Infinite Money Remediation
- **Prior Flaw**: `public.process_referral_milestones(p_referrer_id uuid)` counted all referrals with status `pending` or `rewarded`. Once a user achieved 10 referrals, `(10 % 10) = 0` remained true indefinitely, depositing 3,000 NGN on every invocation.
- **Hardening Applied**: Migration `20261020120000_critical_security_audit_hardening.sql`:
  - Added `wallets.referral_milestones_awarded integer[] DEFAULT '{}'`.
  - Added `FOR UPDATE` row lock on `public.wallets`.
  - Calculated integer milestone tier `v_milestone_tier := (v_count / 10)::integer * 10`.
  - Enforced single-award verification `NOT (v_milestone_tier = ANY(referral_milestones_awarded))`.
  - Logged entry in `public.wallet_transactions`.

### 3.3 Admin Authentication Hardening
- **Prior Flaw**: Functions `is_app_admin()`, `admin_is_owner()`, and `admin_has_permission()` verified owner emails without checking `v_user.email_confirmed_at IS NOT NULL`.
- **Hardening Applied**: Updated all three functions to strictly verify `v_user.email_confirmed_at IS NOT NULL` before awarding owner/admin status.

### 3.4 Self-Gifting Restriction
- **Prior Flaw**: `public.process_gift_purchase(uuid, uuid, uuid, numeric)` lacked an authorization check preventing `p_sender_id = p_receiver_id`.
- **Hardening Applied**: Added `IF p_sender_id = p_receiver_id THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot send gifts to yourself'); END IF;`.

---

## 4. Storage Bucket Security Review

### 4.1 Storage Policies Analysis
1. `chat-media` (`public = false`):
   - Access is restricted to match participants via `private.can_access_match_media((storage.foldername(name))[2])`.
2. `profile-photos` (`public = true`):
   - Read is public. Upload is restricted to `auth.uid() = (storage.foldername(name))[1]`.
3. `pending-avatars` (`public = true`):
   - **Prior Flaw**: Allowed INSERT with only `WITH CHECK (bucket_id = 'pending-avatars')` without checking the user's path.
   - **Hardening Applied**: Enforced `(storage.foldername(name))[1] = auth.uid()::text` for INSERT and UPDATE operations.

---

## 5. Proposed SQL Migration Script
The complete hardening migration is authored at:
`supabase/migrations/20261020120000_critical_security_audit_hardening.sql`.
