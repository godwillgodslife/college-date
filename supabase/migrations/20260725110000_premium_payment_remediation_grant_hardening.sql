-- Tighten client privileges for the premium/payment remediation tables.
-- RLS already denies writes without policies; these grants make that intent
-- explicit at the privilege layer too.

revoke all on public.paid_products from anon, authenticated;
revoke all on public.monetization_config from anon, authenticated;
revoke all on public.payment_attempts from anon, authenticated;
revoke all on public.provider_webhook_events from anon, authenticated;
revoke all on public.entitlements from anon, authenticated;
revoke all on public.wallet_ledger from anon, authenticated;
revoke all on public.payment_audit_logs from anon, authenticated;
revoke all on public.wallet_transactions from anon, authenticated;

grant select on public.paid_products to anon, authenticated;
grant select on public.monetization_config to anon, authenticated;
grant select on public.payment_attempts to authenticated;
grant select on public.entitlements to authenticated;
grant select on public.wallet_ledger to authenticated;
grant select on public.wallet_transactions to authenticated;

grant execute on function public.grant_paid_product_entitlements(uuid, text, text, text, timestamptz, timestamptz, jsonb) to service_role;
grant execute on function public.process_verified_payment(text, text, text, jsonb) to service_role;
grant execute on function public.purchase_premium_with_wallet(text) to authenticated;
grant execute on function public.request_wallet_withdrawal(numeric, jsonb) to authenticated;
grant execute on function public.get_profile_viewers_secure(integer) to authenticated;
grant execute on function public.get_admirers_secure(integer) to authenticated;
grant execute on function public.get_my_entitlements() to authenticated;
grant execute on function public.get_monetization_config() to anon, authenticated;
grant execute on function public.has_entitlement(uuid, text) to authenticated, service_role;
