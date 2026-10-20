# The College Date — Privacy, Abuse, Messaging & Biometric Audit

**Generated Date**: October 20, 2026  
**Auditor**: Privacy Engineer & Anti-Abuse Specialist  
**Standards**: Nigerian Data Protection Act (NDPA 2023), GDPR Principles, OWASP API Security Top 10

---

## 1. Private Messaging & Content Security

### 1.1 Match Participant Isolation
- Direct queries on `public.messages` are filtered via RLS policy `"Native match participants can read messages"`.
- Query projection enforces `private.is_match_participant(match_id)` and verifies `expires_at IS NULL OR expires_at > now()`.
- Messages marked as deleted for the active viewer (`metadata->'deleted_for' @> auth.uid()::text`) are omitted at the database layer.

### 1.2 Disappearing Messages
- Ephemeral chat messages expire automatically when `expires_at < now()`.
- Background trigger `tr_sync_message_read_state` synchronizes `read_at` and `seen_at` timestamps upon viewing.

### 1.3 Off-Platform Contact Guard & Anti-Evasion
- Real-time client inspection in `src/utils/offPlatformGuard.js` blocks phone numbers, WhatsApp, social handles, and fintech handles across Chat, Bios, and Confessions.
- Server-authoritative PostgreSQL trigger `trg_check_message_off_platform_contact` runs `BEFORE INSERT OR UPDATE OF content ON public.messages`.
- Subscribers to Elite Ultra (`is_ultra = true`) are authoritatively verified at the database level before exemption is granted.

---

## 2. Biometrics & Identity Verification

### 2.1 Photo Validation & Liveness Engine
- Edge function `validate-profile-photo` validates student profile images via Multi-Model Vision AI (OpenRouter) ensuring:
  - Exactly 1 human face (`face_count == 1`).
  - Real human authenticity (`is_real_human == true`).
  - Sufficient lighting and clarity (`quality_ok == true`).
- Changing or uploading a primary profile photo (slot 0) automatically revokes `is_verified` and `photo_verified`, setting them to `false` until live facial liveness verification is completed.

### 2.2 Profile Trust Field Integrity
- PostgreSQL trigger `enforce_profile_trust_field_integrity()` prevents users from setting `is_verified`, `photo_verified`, `is_premium`, `is_banned`, or `is_shadow_banned` via direct client updates. Any unauthorized modification to these fields is forcibly reverted to previous state.

---

## 3. Storage Privacy & Media Isolation

### 3.1 Chat Media Bucket (`chat-media`)
- Private bucket (`public = false`).
- Access helper `private.can_access_match_media` confirms caller is a participant of the match associated with the storage folder before granting download or upload privileges.

### 3.2 Pending Avatars Bucket (`pending-avatars`)
- Hardened storage RLS to enforce `(storage.foldername(name))[1] = auth.uid()::text`, preventing users from uploading or overwriting images in other users' storage paths.

---

## 4. Child Safety & Abuse Reporting
- Conforms strictly to Google Play Child Safety Standards and Nigerian Child Rights Act / NDPA 2023.
- In-app reporting option `🛡️ Report Child Safety Concern` exists across chat, profile drawer, and settings.
- Designated Child Safety Officer: Godswill Godlife Onah (`childsafety@thecollegedate.com`, alternative: `godwillgodslife@gmail.com`).
- Zero-tolerance protocol against Child Sexual Abuse and Exploitation (CSAE/CSAM), underage usage, grooming, and extortion, with NCMEC CyberTipline and law enforcement escalation procedures.
