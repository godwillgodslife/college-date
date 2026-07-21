# Rollout Checklist

1. Apply the migration:
   - `supabase/migrations/20260721120000_premium_payment_remediation_foundation.sql`

2. Deploy Edge Functions:
   - `initialize-paystack-payment`
   - `verify-paystack-transaction`
   - `verify-paystack-status`
   - `paystack-webhook`
   - `revenuecat-webhook`

3. Confirm Supabase secrets:
   - `PAYSTACK_SECRET_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `REVENUECAT_WEBHOOK_AUTH`
   - `PUBLIC_SITE_URL` or `SITE_URL`

4. Configure provider webhooks:
   - Paystack webhook URL should point to `/functions/v1/paystack-webhook`.
   - RevenueCat webhook should continue pointing to `/functions/v1/revenuecat-webhook`.

5. Run validation:
   - `npm run payment:remediation:test`
   - `npm run build`

6. Test safe sandbox flows:
   - Web Premium Paystack checkout.
   - Web wallet top-up tiers.
   - Paystack callback verification.
   - Paystack duplicate webhook replay.
   - RevenueCat duplicate webhook replay.
   - Free user Requests/Viewers responses contain no identities.
   - Premium user Requests/Viewers responses contain identities.
   - Android wallet top-up is unavailable.

