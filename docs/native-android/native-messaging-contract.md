# Native Android Messaging Contract

Date: 2026-08-13

Environment: `College Date Staging` / `pxobauvatbjncluuunyq` / `eu-west-1`

Production project excluded: `gedoyoleoscgxgdqszzc`

## Scope

This contract supports the first native messaging increment: an inbox, text-message history, text sending, read state, Realtime updates for the open match, and identity-scoped Room caching.

It does not authorize direct client writes to `messages`, direct reads of `matches`, `conversations`, or broad profile records. Attachments, voice notes, stickers, gifts, calls, typing, presence, push notifications, reactions, edits, deletion, and offline write queues remain deferred.

## Database Boundary

| Object | Client capability | Security boundary |
| --- | --- | --- |
| `public.messages` | `SELECT` for Realtime payloads | RLS permits active match participants only; expired messages are hidden. |
| `public.matches` | None | Used only inside reviewed definer functions. |
| `public.profiles` | None for messaging | Inbox projection returns only matched display name, avatar, and last-active value. |
| `public.conversations` | None | Not required by the native contract. |
| `public.reports` | None | Used inside the private participation predicate to disable chat after a non-dismissed report in either direction. |

Authenticated has no direct `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, or `TRIGGER` privilege on `public.messages`. Anonymous and `PUBLIC` have no message-table privilege.

## RPCs

### `get_native_conversations(p_limit integer, p_offset integer)`

Returns participant-scoped inbox summaries ordered by latest non-expired message. The caller identity comes from `auth.uid()`; no user ID is accepted from the client.

Returned fields:

- `match_id`
- `other_user_id`
- `other_display_name`
- `other_avatar_url`
- `other_last_active`
- last-message ID, content, type, sender, read state, and creation time
- unread count for messages sent by the other participant

Limit is clamped to 1-100 and offset to zero or greater. Matches hidden by the report privacy predicate are omitted.

### `get_native_messages(p_match_id uuid, p_before timestamptz, p_limit integer)`

Returns up to 100 non-expired messages only when the caller is an allowed participant. Results are returned oldest-to-newest for display. `p_before` provides keyset history pagination.

### `send_native_text_message(p_match_id uuid, p_content text, p_client_nonce text)`

Inserts only `type = 'text'` for an allowed participant. Content is trimmed and limited to 1-2,000 characters. The caller is always `auth.uid()`.

`p_client_nonce` must be a UUID. The unique `(sender_id, metadata.client_nonce)` index makes a retry idempotent. Reusing a nonce for a different match fails with `client_nonce_conflict`. Existing match disappearing-message duration is respected when present; the native UI does not expose controls for that deferred feature.

### `mark_native_messages_read(p_match_id uuid)`

Marks only unread, non-expired messages sent by the other participant in an allowed match. Returns the number of changed rows.

## Function Security

The four public RPCs and `private.is_match_participant(uuid)` are `SECURITY DEFINER` with `search_path = ''`. Every referenced object is schema-qualified.

- `authenticated`: execute allowed
- `anon`: execute denied
- `PUBLIC`: execute denied

The private predicate requires an authenticated participant and denies access when `public.reports` contains a non-dismissed report between the two participants in either direction.

## Realtime

`public.messages` remains in `supabase_realtime`. The Android client subscribes to Postgres `INSERT` and `UPDATE` events filtered by the currently open `match_id`.

Realtime requires table-level `SELECT` for a stable row payload. RLS remains the row boundary, so an authenticated caller can receive only non-expired messages from matches that pass `private.is_match_participant`. The client removes the channel when the chat leaves composition or connectivity is lost.

## Android Data Flow

1. Inbox/history is fetched through narrow RPCs.
2. Remote results replace the current user's matching Room cache.
3. Room `Flow` is the UI source of truth.
4. Realtime inserts/updates are upserted into the same owner-scoped cache.
5. Sends use an RPC and retain the same nonce after failure until the draft changes or succeeds.
6. Offline cached history remains readable; sending is disabled and no pending write is queued.
7. Logout, session loss, and account-local cleanup clear all messaging cache rows.

## Applied Staging Migrations

- `20260813103000_native_text_messaging_contract.sql`
- `20260813111500_allow_participant_message_realtime_payload.sql`
- `20260813114500_align_native_messaging_report_privacy.sql`
- `20260813130000_harden_native_message_idempotency_race.sql`

The connected staging migration ledger records these as `native_text_messaging_contract`, `allow_participant_message_realtime_payload`, `align_native_messaging_report_privacy`, and `harden_native_message_idempotency_race`. No production migration was applied.

## Rollback

Rollback requires a reviewed staging migration that:

1. Revokes authenticated execution on the four public RPCs.
2. Drops the four public RPCs.
3. Removes the participant message `SELECT` policy and revokes authenticated table `SELECT`.
4. Drops `messages_sender_client_nonce_unique`.
5. Drops `private.is_match_participant(uuid)` only after confirming no Storage or later contract depends on it.

Do not run the inline rollback notes directly against production. Reconcile production function/policy dependencies first.
