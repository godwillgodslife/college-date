# Staging Auth Connectivity Report

Date: 2026-08-01

Project: `College Date Staging` / `pxobauvatbjncluuunyq`

Production project `gedoyoleoscgxgdqszzc` was not accessed or modified.

## Summary

The earlier DNS failure for `pxobauvatbjncluuunyq.supabase.co` is no longer reproducible on this workstation. Staging API and Auth endpoints are reachable over IPv4.

The remaining Auth blocker is not DNS. It is Supabase Auth email validation plus confirmation email rate limiting.

## Connectivity Checks

| Check | Result |
| --- | --- |
| MCP project lookup | `College Date Staging`, ref `pxobauvatbjncluuunyq`, region `eu-west-1`, status `ACTIVE_HEALTHY` |
| MCP project URL | `https://pxobauvatbjncluuunyq.supabase.co` |
| Default Windows DNS | Resolved `A 172.64.149.246` |
| Google DNS `8.8.8.8` | Resolved `A 104.18.38.10`, `A 172.64.149.246` |
| Cloudflare DNS `1.1.1.1` | Timed out from this machine |
| IPv4 HTTPS | Reachable; unauthenticated Auth/API calls return expected `401` |
| IPv6 HTTPS | No usable resolution path from this machine |
| Windows hosts file | No Supabase or staging override found |
| Proxy environment variables | No proxy variables found |
| Supabase project health | `ACTIVE_HEALTHY` |

## Auth Settings

Public Auth settings check succeeded with the staging publishable key:

- Email provider enabled: yes
- Signup disabled: no
- Mailer auto-confirm: no
- Phone provider: disabled
- Anonymous users: disabled
- OAuth providers checked in settings output: disabled

## Disposable User Creation Attempts

Supported method attempted: public Supabase Auth signup with generated in-memory passwords.

Results:

- `.test` and `example.com` synthetic email domains were rejected by Supabase Auth as invalid email addresses.
- A synthetic address under the application domain reached the Auth service but failed with `429`.
- Auth logs show the exact error code: `over_email_send_rate_limit`.
- No passwords or tokens were stored.
- No profile, user settings, swipe-limit, match, report, confession, or Storage rows were created.

## Available Tooling

Connected Supabase tools available for this pass:

- project listing and project details
- project URL and publishable key lookup
- SQL metadata queries
- migration application
- security/performance advisors
- logs
- Edge Function deployment

No connected Supabase Auth admin tool was available to create, confirm, invite, or delete users.

## Methods Considered

| Method | Result |
| --- | --- |
| Direct SQL insert into `auth.users` | Not used. Explicitly disallowed. |
| Public Auth signup | Reached staging, but blocked by email validation/rate limiting. |
| MCP Auth user creation | Not available in connected tools. |
| Staging Edge Function using server-side secret keys | Technically possible in principle, but not used. The current toolset can deploy functions but does not expose a safe delete/disable operation or a pre-existing authenticated admin session for secure invocation. Leaving a temporary user-creation endpoint in staging would be avoidable risk. |
| Manual dashboard creation | Recommended next supported path for disposable confirmed users. |

Supabase documentation confirms Edge Functions can access server-side Supabase secret keys by default and that those keys must never be used in browser clients. That makes an Edge Function viable only if it is tightly secured, short-lived, reviewed, and removable.

## Root Cause

Current DNS root cause: not reproducible. The hostname now resolves locally and the API is reachable over IPv4. The previous failure was likely transient DNS propagation or local resolver cache behavior.

Current Auth-user creation root cause: staging Auth requires confirmation email delivery and the project is over the email send rate limit. Public signup cannot reliably create confirmed disposable users for session tests in the current state.

## Next Manual Step

Create disposable confirmed users in the Supabase dashboard or provide a supported Auth admin tool. Do not share service-role keys. Do not insert directly into `auth.users`.
