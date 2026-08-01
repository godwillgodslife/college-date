# Profile Data Access Classification

Date: 2026-08-01

Scope: `public.profiles` fields observed from repository usage, migrations, and a redacted anonymous REST shape check. No profile values were printed or used as examples.

## Classification Levels

- Public discovery-safe: may be shown without authentication. No current profile column is approved for this level.
- Authenticated-user discovery-safe: may be shown to signed-in eligible users in discovery or public profile cards.
- Match-only: may be shown only after a match or equivalent relationship.
- Owner-only: readable/updatable only by the profile owner, except server-side workflows.
- Administrative-only: restricted to admin/server moderation and operations.
- Sensitive: should not be exposed to general clients.
- Requires product-owner decision: product policy must decide before native use.

## Matrix

| Column | Classification | Reason |
| --- | --- | --- |
| `id` | Authenticated-user discovery-safe | Needed for swipe/match actions, but should not be anonymous. |
| `full_name` | Requires product-owner decision | Used as display name. If it is legal name, reduce to first name/display name in discovery. |
| `username` | Authenticated-user discovery-safe | Public handle for signed-in dating surfaces. |
| `email` | Sensitive | Account identifier, not dating-profile content. |
| `phone` | Sensitive | Direct contact information. |
| `age` | Authenticated-user discovery-safe | Core dating eligibility/filtering field. |
| `gender` | Authenticated-user discovery-safe | Used for matching and display. |
| `role` | Requires product-owner decision | Appears to overlap gender/signup role. Should not be treated as authorization. |
| `interest_gender` | Owner-only | User preference/filter, not necessarily display content. |
| `attraction_goal` | Authenticated-user discovery-safe | Dating intent shown/filtered in discovery. |
| `university` | Authenticated-user discovery-safe | Campus matching field. |
| `department` | Authenticated-user discovery-safe | Campus profile field, if product confirms display. |
| `faculty` | Authenticated-user discovery-safe | Campus profile field, if product confirms display. |
| `level` | Authenticated-user discovery-safe | Campus/student profile field. |
| `bio` | Authenticated-user discovery-safe | User-authored dating profile content. |
| `interests` | Authenticated-user discovery-safe | User-authored dating profile content. |
| `avatar_url` | Authenticated-user discovery-safe | Profile image URL for signed-in discovery/matches. |
| `profile_photos` | Authenticated-user discovery-safe | Profile gallery for signed-in discovery/matches. |
| `photos` | Requires product-owner decision | Legacy/alternate photo field; verify meaning before native use. |
| `voice_intro_url` | Match-only | Voice may be more personal; require PO decision before discovery-wide playback. |
| `intro_prompt` | Authenticated-user discovery-safe | Profile prompt content, if user-authored for display. |
| `anthem` | Authenticated-user discovery-safe | Profile display/media preference if product intends it public. |
| `mbti` | Authenticated-user discovery-safe | Optional personality display field. |
| `genotype` | Sensitive | Health/genetic information; do not expose broadly without explicit consent policy. |
| `status_text` | Authenticated-user discovery-safe | User-authored status if feature intends public display. |
| `current_badge` | Authenticated-user discovery-safe | Display badge if server-controlled. |
| `is_verified` | Authenticated-user discovery-safe | Trust badge, but only the boolean/status should be exposed. |
| `ai_verification_status` | Authenticated-user discovery-safe | Trust badge status only. |
| `ai_verification_score` | Administrative-only | Internal trust/moderation score. |
| `ai_photo_origin` | Administrative-only | Internal trust/moderation metadata. |
| `ai_reviewed_at` | Administrative-only | Internal review timestamp. |
| `ai_review_summary` | Administrative-only | Internal or sensitive moderation summary. |
| `ai_review_flags` | Administrative-only | Internal moderation flags. |
| `is_online` | Requires product-owner decision | May be displayed only if user privacy setting allows it. |
| `is_live` | Requires product-owner decision | Should be derived from recent activity and privacy setting. |
| `last_seen` | Match-only | Exact presence timestamp is privacy-sensitive. |
| `last_seen_at` | Match-only | Exact presence timestamp is privacy-sensitive. |
| `last_active` | Match-only | Exact presence timestamp is privacy-sensitive. |
| `show_online_status` | Owner-only | Privacy setting. |
| `location_status` | Owner-only | Location/privacy state. Do not expose as raw profile data. |
| `incognito_mode` | Owner-only | Privacy mode setting. |
| `is_onboarded` | Owner-only | Routing/completion state, not public profile content. |
| `completion_score` | Administrative-only | Internal ranking/completeness signal. |
| `is_premium` | Requires product-owner decision | Public badge may be OK; entitlement source should remain server-side. |
| `premium_expires_at` | Owner-only | Subscription expiry/account state. |
| `free_swipes` | Owner-only | Quota/economy field. |
| `free_swipes_remaining` | Owner-only | Quota/economy field. |
| `coins` | Owner-only | Wallet/economy-like balance. |
| `streak_freeze_count` | Owner-only | Economy/benefit inventory. |
| `call_minutes_today` | Owner-only | Usage/quota counter. |
| `last_call_reset_at` | Owner-only | Usage/quota timestamp. |
| `referral_code` | Owner-only | May be exposed only through `validate_referral_code` response. |
| `referred_by` | Owner-only | Referral relationship data. |
| `onesignal_id` | Sensitive | Push provider identifier. |
| `push_token` | Sensitive | Device push token. |
| `message_notifications` | Owner-only | Notification preference. |
| `request_notifications` | Owner-only | Notification preference. |
| `profile_activity_notifications` | Owner-only | Notification preference. |
| `social_notifications` | Owner-only | Notification preference. |
| `marketing_notifications` | Owner-only | Notification preference. |
| `email_notifications` | Owner-only | Notification preference. |
| `match_notifications` | Owner-only | Notification preference. |
| `confession_notifications` | Owner-only | Notification preference. Client-side checks for another user should move server-side. |
| `view_notifications` | Owner-only | Notification preference. |
| `push_notifications` | Owner-only | Notification preference. |
| `message_previews_enabled` | Owner-only | Notification privacy preference. |
| `quiet_hours_enabled` | Owner-only | Notification preference. |
| `quiet_hours_start` | Owner-only | Notification preference. |
| `quiet_hours_end` | Owner-only | Notification preference. |
| `vibration_enabled` | Owner-only | Notification preference. |
| `sound_enabled` | Owner-only | Notification preference. |
| `is_banned` | Administrative-only | Moderation state. |
| `is_shadow_banned` | Administrative-only | Moderation state. |
| `is_blocked` | Administrative-only | Ambiguous moderation/account state. |
| `is_optimised` | Administrative-only | Internal operational flag. |
| `created_at` | Requires product-owner decision | Can support "new" badges, but exact account creation time is not needed broadly. |
| `updated_at` | Owner-only | Internal sync timestamp. |
| `photo_updated_at` | Owner-only | Internal sync/cache timestamp. |
| `status_updated_at` | Requires product-owner decision | May support status freshness, but exact timestamp should be minimized. |

## Immediate Access Rule

No `profiles` column is currently approved for anonymous direct REST access. Signed-in discovery should use a limited, reviewed interface that returns only the authenticated-user discovery-safe subset.
