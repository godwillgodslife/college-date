# Project: The College Date — Server-Authoritative Notifications & UX Polish

## Architecture
The notification and messaging subsystem of The College Date (CD 2.0) is upgraded from client-driven dispatches to a robust, server-authoritative, fault-tolerant architecture:

1. **Database-Triggered Push Engine (`public.notifications` -> `pg_net` -> `send-notification-push`)**:
   - PostgreSQL `AFTER INSERT` trigger `trg_notifications_push_dispatch` captures row creation.
   - Asynchronously invokes the Supabase Edge Function `send-notification-push` via `net.http_post` with `service_role` credentials.
   - Dual-payload parser in `send-notification-push` resolves device tokens via `user_notification_devices` and `profiles.onesignal_id`, enforces user profile preferences, masks sensitive previews, and writes delivery timestamps (`sent_at`, `failed_at`) back to Postgres.
   - Client sender termination or network drop never drops push delivery.

2. **Delayed Email Unread Fallback Pipeline (`public.notification_email_queue` -> Hostinger SMTP)**:
   - Eliminates instant client-side email triggers in `notificationService.js`.
   - On notification insertion, rows are enqueued in `public.notification_email_queue` with `scheduled_for = now() + interval '15 minutes'`.
   - When the user reads the notification or views the chat thread, fast-path triggers and RPCs immediately mark pending items as `cancelled_read`.
   - Worker processing in `send-notification-email` (`action: 'process-queue'`) verifies unread status before invoking Hostinger SMTP (`smtp.hostinger.com:465`), preventing spam.

3. **Quadruple In-Chat Active Presence Alert Suppression**:
   - Real-time Phoenix presence (`isOtherOnline`) in `Chat.jsx` is passed into message sending as `recipientIsActive: true` and `suppress_push: true`.
   - The database trigger skips OneSignal dispatch when `metadata->>'suppress_push' = 'true'`.
   - In-chat unconditional audio ding (`playNotificationDing` on line 839 of `Chat.jsx`) is suppressed when document is visible and focused.
   - URL parameter synchronization (`/chat?chatId=${conv.id}`) ensures `isViewingNotificationDestination` evaluates to `true`, suppressing in-app toast banners and duplicate chimes.

4. **Chronological Notification Center Organization & Tactile Polish**:
   - Partitions notifications into "Today", "Yesterday", and "Earlier" using local calendar midnight boundaries.
   - New `src/services/haptics.js` provides light, medium, success, and warning haptic triggers with native Capacitor and Web `navigator.vibrate` fallback.
   - First-class Light Theme tokens (`#ffffff` surfaces, visible borders, unread highlights) eliminate low-contrast transparency issues.
   - Loading skeletons and network error recovery states guarantee smooth UX.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | DB Push Trigger | Asynchronous `AFTER INSERT` trigger on `public.notifications` using `pg_net` | M1 | Survey 1 / ORIGINAL_REQUEST R1 |
| F2 | Edge Push Dual-Payload Parser | Support database webhook record format + direct client calls in `send-notification-push` | M1 | Survey 1 / ORIGINAL_REQUEST R1 |
| F3 | Push Preference & Shield Enforcement | Server-side profile notification preferences & anonymous confession shields | M1 | Survey 1 / ORIGINAL_REQUEST R1 |
| F4 | Push Delivery Lifecycle Tracking | Record `sent_at` and `failed_at` timestamps on `public.notifications` | M1 | Survey 1 / ORIGINAL_REQUEST R1 |
| F5 | Delayed Email Queue Schema | Table `public.notification_email_queue` with indices, retry count, and status enum | M2 | Survey 2 / ORIGINAL_REQUEST R2 |
| F6 | Email Enqueue Trigger | Trigger enqueuing emails with 15-minute grace window on `public.notifications` insert | M2 | Survey 2 / ORIGINAL_REQUEST R2 |
| F7 | Email Cancellation on Read | Trigger & RPC marking pending emails as `cancelled_read` upon read/seen | M2 | Survey 2 / ORIGINAL_REQUEST R2 |
| F8 | Email Queue Worker Dispatcher | `send-notification-email` `process-queue` worker verifying unread state before SMTP | M2 | Survey 2 / ORIGINAL_REQUEST R2 |
| F9 | In-Chat Bubble Ding Suppression | Suppress loud audio ding in `Chat.jsx` when tab is visible and focused | M3 | Survey 2 / ORIGINAL_REQUEST R3 |
| F10 | Presence Forwarding to Messages | Forward `isOtherOnline` as `recipientIsActive` and `suppress_push` in `Chat.jsx` | M3 | Survey 2 / ORIGINAL_REQUEST R3 |
| F11 | Active Chat URL Sync & Toast Suppression | Sync `/chat?chatId=...` and update `isViewingNotificationDestination` to suppress toasts | M3 | Survey 2 / ORIGINAL_REQUEST R3 |
| F12 | Chronological Date Grouping | Partition notifications into "Today", "Yesterday", "Earlier" by local midnight | M4 | Survey 3 / ORIGINAL_REQUEST R4 |
| F13 | Haptics Service Subsystem | Create `src/services/haptics.js` with light, medium, success, warning feedback | M4 | Survey 3 / ORIGINAL_REQUEST R4 |
| F14 | Notification Center Light Theme Tokens | High-contrast light surfaces, crisp borders, and unread accent indicators | M4 | Survey 3 / ORIGINAL_REQUEST R4 |
| F15 | Notification Center UX States | Shimmer loading skeletons, contextual empty states, and error recovery retry | M4 | Survey 3 / ORIGINAL_REQUEST R4 |
| F16 | Automated Test Expansion | Create `test/server-authoritative-notifications-and-ux.test.mjs` (>= 9 new tests) | M5 | Survey 3 / ORIGINAL_REQUEST R5 |
| F17 | Quality Gates Verification | Verify `npm run test:all` (100% pass >= 125 tests), `npm run build`, and `./gradlew assembleRelease` | M5 | Survey 3 / ORIGINAL_REQUEST R5 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Server-Authoritative Push Delivery Trigger | Migration for `trg_notifications_push_dispatch`, `send-notification-push` dual-payload handling, lifecycle timestamps, client push cleanup | none | COMPLETED |
| 2 | M2: Delayed Email Unread Fallback Pipeline | Migration for `notification_email_queue`, enqueue & cancel triggers, `send-notification-email` worker, client email cleanup | none | COMPLETED |
| 3 | M3: In-Chat Active Presence Alert Suppression | Real-time presence forwarding in `Chat.jsx`, audio ding suppression, URL param sync, toast suppression | M1, M2 | COMPLETED |
| 4 | M4: Chronological Notification Center Organization & UX Polish | Date grouping ("Today", "Yesterday", "Earlier"), `haptics.js` service, light theme tokens, skeleton/error states | none | COMPLETED |
| 5 | M5: E2E Quality Gates & Build Verification | Comprehensive test suite `test/server-authoritative-notifications-and-ux.test.mjs`, `npm run test:all`, `npm run build`, `./gradlew assembleRelease` | M1, M2, M3, M4 | COMPLETED |

---

## Interface Contracts

### 1. Database Push Trigger ↔ `send-notification-push` Edge Function
- **HTTP Method**: `POST`
- **URL**: `${SUPABASE_URL}/functions/v1/send-notification-push`
- **Headers**: `Content-Type: application/json`, `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
- **Payload Schema**:
  ```json
  {
    "type": "INSERT",
    "table": "notifications",
    "schema": "public",
    "record": {
      "id": "uuid",
      "user_id": "uuid",
      "actor_id": "uuid",
      "type": "string",
      "category": "string",
      "title": "string",
      "content": "string",
      "metadata": {
        "url": "string",
        "suppress_push": false,
        "is_anonymous": false
      },
      "deep_link": "string",
      "created_at": "ISO8601 string"
    }
  }
  ```

### 2. `public.notifications` ↔ `public.notification_email_queue`
- **Trigger**: `AFTER INSERT ON public.notifications`
- **Grace Window**: `scheduled_for = now() + interval '15 minutes'`
- **Dedupe Key**:
  - Chat: `'email:chat:' || user_id || ':' || conversation_id`
  - Request: `'email:request:' || user_id`
  - General: `'email:' || user_id || ':' || id`
- **Cancellation Trigger**: `AFTER UPDATE OF is_read ON public.notifications` -> `status = 'cancelled_read'`
- **RPC**: `mark_conversation_read_and_cancel_emails(p_match_id uuid, p_user_id uuid)`

### 3. `Chat.jsx` ↔ `chatService.js` Presence Contract
- **Presence Signal**: `isOtherOnline = opponentPresences.length > 0`
- **Message Metadata**:
  ```javascript
  {
    ...metadata,
    recipientIsActive: isOtherOnline,
    suppressPush: isOtherOnline,
    suppress_push: isOtherOnline,
    suppress_email: isOtherOnline
  }
  ```
- **Active Chat URL & Event**:
  - `navigate('/chat?chatId=' + conv.id, { replace: true })`
  - `window.dispatchEvent(new CustomEvent('tcd:active-chat-changed', { detail: { chatId: conv.id } }))`

### 4. `haptics.js` Service API
- `triggerLightHaptic()`: Light impact for taps, card opens, dismissals
- `triggerMediumHaptic()`: Medium impact for selections, tabs
- `triggerSuccessHaptic()`: Notification success pattern for bulk mark read
- `triggerWarningHaptic()`: Notification warning pattern for deletions / clear all

### 5. `groupNotificationsByDate(items)` Contract
- Input: `Array<Notification>`
- Output: `Array<{ id: 'today'|'yesterday'|'earlier', label: 'Today'|'Yesterday'|'Earlier', items: Array<Notification>, unreadCount: number }>`
- Comparison: Local calendar midnight boundaries (`new Date(year, month, date).getTime()`)

---

## Code Layout
- `supabase/migrations/`:
  - `20261008180000_server_authoritative_push_trigger.sql` (M1)
  - `20261008190000_delayed_email_queue_and_presence_suppression.sql` (M2)
- `supabase/functions/`:
  - `send-notification-push/index.ts` (M1)
  - `send-notification-email/index.ts` (M2)
- `src/services/`:
  - `notificationService.js` (M1, M2)
  - `chatService.js` (M3)
  - `haptics.js` (M4)
- `src/utils/`:
  - `notificationRouting.js` (M3)
  - `haptics.js` (M4)
- `src/pages/`:
  - `Chat.jsx` (M3)
  - `NotificationCenter.jsx` (M4)
  - `NotificationCenter.css` (M4)
- `src/styles/`:
  - `androidPolish.css` (M4)
- `test/`:
  - `server-authoritative-notifications-and-ux.test.mjs` (M5)
