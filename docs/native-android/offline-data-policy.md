# Offline Data Policy

Date: 2026-08-01

## Phase 1 Scope

The native project includes the offline-first foundation only. It does not claim complete offline discovery, messaging, wallet, or payment behavior.

Implemented foundations:

- Room database: `cached_profiles` and `pending_writes`
- DataStore preferences: last user id and onboarding-completion hint
- Repository contracts and local/remote data-source separation
- Connectivity observation
- WorkManager periodic sync scaffold
- Pending-write representation
- Cache timestamp support for expiration decisions
- Logout/local data clearing hooks

## May Be Cached Locally

Cache only the minimum data needed for responsive UI and poor-network recovery:

- Current user profile summary: id, display name, username, avatar URL, onboarding flag, cache timestamp
- Discovery cards after RLS verification: profile summary, public photo URLs, basic preference metadata, cache timestamp
- Match summaries: match id, other user public summary, last message preview, unread count, cache timestamp
- Conversation list and recent messages: recent text/media metadata needed for continuity, bounded by retention policy
- Non-sensitive app configuration: public feature flags, display limits, copy variants
- Pending writes: operation type, owner user id, sanitized JSON payload, attempt count, last error

## Should Not Be Stored Unnecessarily

Do not cache:

- Raw passwords
- Supabase service-role keys
- Paystack secret keys
- RevenueCat webhook secrets
- Google service-account JSON
- Signing keys or keystore passwords
- Full payment card/bank details
- Administrative credentials
- Broad exports of other users' private profile data
- Unbounded chat history
- Moderation/admin data
- Sensitive identity documents unless a future reviewed feature explicitly requires encrypted local storage

## Session Persistence

Use the Supabase Kotlin SDK session mechanism. Do not implement remember-password. Logout must:

- Sign out through Supabase where possible
- Clear local session preference state
- Clear cached profile rows
- Clear future pending writes for the user where appropriate
- Avoid logging tokens or credentials

## Cache Expiration

Recommended defaults for future phases:

- Current profile: refresh on app foreground and after profile edits
- Discovery cards: expire after 15 minutes or after swipe action
- Match summaries: expire after 5 minutes or realtime update
- Recent messages: keep a bounded recent window; refresh when opening a conversation
- App config: expire after 24 hours unless realtime/config versioning is added

## Pending Writes

Pending writes must include:

- Stable id
- Owner user id
- Operation type
- Sanitized payload JSON
- Created timestamp
- Attempt count
- Last error

Only idempotent or safely retryable actions should be queued. Payments, wallet debits, subscription grants, and admin actions must not be queued client-side without a reviewed server idempotency contract.

## Retry Strategy

Use WorkManager with network constraints. Retry with bounded exponential backoff. Stop retrying and surface an error when:

- Authentication is revoked or expired
- RLS rejects the operation
- The backend returns a validation error
- A payment/economy action lacks a server idempotency key

## Account Deletion

When account deletion is implemented, native local cleanup must remove:

- Supabase session
- DataStore session hints
- Room profile cache
- Future discovery/match/message caches
- Pending writes
- Notification token association where possible

Server-side account deletion must be handled by a secure reviewed endpoint; it is not part of phase 1.
