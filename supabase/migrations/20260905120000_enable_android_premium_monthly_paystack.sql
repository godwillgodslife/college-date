-- Migration: 20260905120000_enable_android_premium_monthly_paystack.sql
-- Enables 'android' platform for premium_monthly in paid_products so Android users
-- and manual test builds can subscribe via Paystack card payment.

update public.paid_products
set platforms = array['web', 'android']
where product_id = 'premium_monthly'
  and provider = 'paystack';
