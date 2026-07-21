import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(file, needles) {
  const text = read(file);
  for (const needle of needles) {
    assert(text.includes(needle), `${file} is missing ${needle}`);
  }
}

function assertExcludes(file, needles) {
  const text = read(file);
  for (const needle of needles) {
    assert(!text.includes(needle), `${file} still contains ${needle}`);
  }
}

assertIncludes('supabase/migrations/20260721120000_premium_payment_remediation_foundation.sql', [
  'create table if not exists public.paid_products',
  'create table if not exists public.payment_attempts',
  'create table if not exists public.provider_webhook_events',
  'create table if not exists public.entitlements',
  'create table if not exists public.wallet_ledger',
  'create or replace function public.process_verified_payment',
  'create or replace function public.purchase_premium_with_wallet',
  'create or replace function public.get_profile_viewers_secure',
  'create or replace function public.get_admirers_secure',
  "'premium_monthly'",
  "'wallet_2000'",
  "'free_swipes_per_day', '{\"value\": 20}'::jsonb"
]);

assertIncludes('supabase/functions/initialize-paystack-payment/index.ts', [
  "from('paid_products')",
  "from('payment_attempts')",
  'https://api.paystack.co/transaction/initialize',
  'authorizationUrl'
]);

assertIncludes('supabase/functions/verify-paystack-transaction/index.ts', [
  "from('payment_attempts')",
  'amountMatches',
  'currencyMatches',
  'referenceMatches',
  "supabase.rpc('process_verified_payment'"
]);
assertExcludes('supabase/functions/verify-paystack-transaction/index.ts', [
  'transactionId'
]);

assertIncludes('supabase/functions/paystack-webhook/index.ts', [
  'x-paystack-signature',
  "from('provider_webhook_events')",
  'amountMatches',
  'currencyMatches',
  "supabase.rpc('process_verified_payment'"
]);

assertIncludes('supabase/functions/revenuecat-webhook/index.ts', [
  "from('provider_webhook_events')",
  "supabase.rpc('grant_paid_product_entitlements'",
  "'Duplicate RevenueCat event ignored'"
]);

assertIncludes('src/pages/PremiumUpgrade.jsx', [
  'startPaystackPayment(PAYSTACK_PRODUCTS.premiumMonthly)',
  'openHostedPaystackCheckout(payment)'
]);
assertExcludes('src/pages/PremiumUpgrade.jsx', [
  'createTransaction',
  'initializePaystack',
  'completeTransaction'
]);

assertIncludes('src/pages/Wallet.jsx', [
  'FUNDING_OPTIONS',
  'startPaystackPayment(selectedFundingProduct.productId)',
  'openHostedPaystackCheckout(payment)',
  'isNativeAndroid()',
  'requestWalletWithdrawal(amount'
]);
assertExcludes('src/pages/Wallet.jsx', [
  'createTransaction',
  'initializePaystack',
  'completeTransaction'
]);

assertIncludes('src/pages/Viewers.jsx', [
  "rpc('get_profile_viewers_secure'",
  'viewerSummary.total_count'
]);
assertIncludes('src/pages/Requests.jsx', [
  "rpc('get_admirers_secure'",
  'requestSummary.total_count'
]);
assertIncludes('src/pages/Chat.jsx', [
  "supabase.rpc('get_admirers_secure'",
  "supabase.rpc('get_profile_viewers_secure'"
]);
assertExcludes('src/pages/Viewers.jsx', ['profiles!viewer_id']);
assertExcludes('src/pages/Requests.jsx', ['profiles!swipes_swiper_id_fkey(*)']);
assertExcludes('src/pages/Chat.jsx', ['profiles!swipes_swiper_id_fkey']);

if (failures.length > 0) {
  console.error('Payment remediation checks failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Payment remediation checks passed.');
