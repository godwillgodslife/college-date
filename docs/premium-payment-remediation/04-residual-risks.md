# Residual Risks

- The local migration and Edge Functions still need deployment and verification against the live Supabase project.
- Provider dashboard webhook URLs were not configured in this pass.
- Direct table RLS for all legacy `swipes` reads was not fully redesigned because discovery and mutual-match logic still depend on selected rows. The dangerous identity UI surfaces now use secure RPCs.
- RevenueCat restore still depends primarily on RevenueCat webhooks. The webhook is idempotent and entitlement-aware, but a separate RevenueCat REST reconciliation job would further reduce drift.
- Admin configuration still has older `free_daily_swipes` references; this pass seeded `free_swipes_per_day = 20` in the monetization config but did not fully consolidate admin config.
