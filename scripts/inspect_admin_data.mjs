import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

async function signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
        },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(`Sign in failed: ${JSON.stringify(data)}`);
    }
    return createClient(SUPABASE_URL, ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${data.access_token}`
            }
        }
    });
}

async function main() {
  const client = await signIn('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');

  console.log('--- 1. PROFILES COUNT & STATUS ---');
  const { data: allProfiles, count: profileCount, error: pErr } = await client
    .from('profiles')
    .select('id, full_name, email, role, gender, created_at, updated_at, last_seen, last_seen_at, last_active, is_online, is_live, is_banned, is_shadow_banned, is_verified', { count: 'exact' });

  console.log('Total profiles count:', profileCount, 'Error:', pErr?.message);
  if (allProfiles) {
    console.log(`Loaded ${allProfiles.length} profiles.`);
    const banned = allProfiles.filter(p => p.is_banned);
    const shadow = allProfiles.filter(p => p.is_shadow_banned);
    const verified = allProfiles.filter(p => p.is_verified);
    const online = allProfiles.filter(p => p.is_online);
    const live = allProfiles.filter(p => p.is_live);
    console.log(`Breakdown: Banned: ${banned.length}, Shadow: ${shadow.length}, Verified: ${verified.length}, Online flag: ${online.length}, Live flag: ${live.length}`);

    const now = Date.now();
    const active15m = allProfiles.filter(p => {
      const ts = new Date(p.last_seen_at || p.last_active || p.last_seen || 0).getTime();
      return now - ts <= 15 * 60 * 1000;
    });
    const active24h = allProfiles.filter(p => {
      const ts = new Date(p.last_seen_at || p.last_active || p.last_seen || 0).getTime();
      return now - ts <= 24 * 60 * 60 * 1000;
    });
    const active7d = allProfiles.filter(p => {
      const ts = new Date(p.last_seen_at || p.last_active || p.last_seen || 0).getTime();
      return now - ts <= 7 * 24 * 60 * 60 * 1000;
    });

    console.log(`Activity based on profile timestamp:`);
    console.log(`Active last 15 min: ${active15m.length}`);
    console.log(`Active last 24 hours: ${active24h.length}`);
    console.log(`Active last 7 days: ${active7d.length}`);

    console.log('\nSample profiles timestamps:');
    allProfiles.slice(0, 15).forEach(p => {
      console.log(`- ${p.full_name || 'No Name'} (${p.email || p.id}): created=${p.created_at}, updated=${p.updated_at}, last_seen=${p.last_seen}, last_seen_at=${p.last_seen_at}, last_active=${p.last_active}`);
    });
  }

  console.log('\n--- 2. ENGAGEMENT SCORES ---');
  const { data: scores, count: scoreCount, error: esErr } = await client
    .from('engagement_scores')
    .select('*', { count: 'exact' });
  console.log('Engagement scores count:', scoreCount, 'Error:', esErr?.message);
  if (scores) {
    console.log(`Loaded ${scores.length} scores`);
    const now = Date.now();
    const active24h = scores.filter(s => {
      const ts = new Date(s.last_login || 0).getTime();
      return now - ts <= 24 * 60 * 60 * 1000;
    });
    console.log(`Engagement scores last_login <= 24h: ${active24h.length}`);
  }
    console.log('\n--- 3. DATABASE DEEP DIVE: PROFILES ACTIVITY ---');
    const now = Date.now();
    let onlineNow = 0; // < 5 mins
    let active24h = 0; // < 24 hours
    let active7d = 0;  // < 7 days
    let active30d = 0; // < 30 days
    let inactive = 0;  // >= 30 days or never
    let goodStanding = 0; // not banned, not shadow
    let bannedCount = 0;
    let shadowCount = 0;
    let verifiedCount = 0;
    let premiumCount = 0;

    allProfiles.forEach(p => {
      const isB = p.is_banned === true;
      const isS = p.is_shadow_banned === true;
      if (isB) bannedCount++;
      else if (isS) shadowCount++;
      else goodStanding++;

      if (p.is_verified) verifiedCount++;
      if (p.is_premium) premiumCount++;

      const ts = new Date(p.last_seen_at || p.last_active || p.last_seen || 0).getTime();
      const diff = now - ts;
      if (ts > 0) {
        if (diff <= 5 * 60 * 1000) onlineNow++;
        if (diff <= 24 * 60 * 60 * 1000) active24h++;
        if (diff <= 7 * 24 * 60 * 60 * 1000) active7d++;
        if (diff <= 30 * 24 * 60 * 60 * 1000) active30d++;
        else inactive++;
      } else {
        inactive++;
      }
    });

    console.log(`TOTAL USERS IN DB: ${allProfiles.length}`);
    console.log(`ACCOUNT STANDING:`);
    console.log(`- Good standing (unrestricted): ${goodStanding}`);
    console.log(`- Shadow banned: ${shadowCount}`);
    console.log(`- Banned: ${bannedCount}`);
    console.log(`- Verified: ${verifiedCount}`);
    console.log(`- Premium: ${premiumCount}`);
    console.log(`\nREAL-TIME USER ACTIVITY:`);
    console.log(`- Online Now (seen in last 5 mins): ${onlineNow}`);
    console.log(`- Active Today (seen in last 24h): ${active24h}`);
    console.log(`- Active This Week (seen in last 7d): ${active7d}`);
    console.log(`- Active This Month (seen in last 30d): ${active30d}`);
    console.log(`- Inactive (> 30d or never): ${inactive}`);

    console.log('\n--- 4. TOP ACTIVE USERS RECENTLY ---');
    const sortedByActivity = [...allProfiles].sort((a, b) => {
      const tsA = new Date(a.last_seen_at || a.last_active || a.last_seen || 0).getTime();
      const tsB = new Date(b.last_seen_at || b.last_active || b.last_seen || 0).getTime();
      return tsB - tsA;
    });

    console.log('\n--- 5. CHECKING OTHER SYSTEM DATA ---');
    // Wallets
    const { data: wallets, count: walletCount } = await client.from('wallets').select('*', { count: 'exact' });
    console.log(`Wallets: count=${walletCount}`);
    if (wallets && wallets.length > 0) {
      const positiveAvail = wallets.filter(w => Number(w.available_balance) > 0);
      const positivePending = wallets.filter(w => Number(w.pending_balance) > 0);
      const totalAvail = wallets.reduce((sum, w) => sum + Number(w.available_balance || 0), 0);
      const totalPending = wallets.reduce((sum, w) => sum + Number(w.pending_balance || 0), 0);
      console.log(`- Wallets with available balance > 0: ${positiveAvail.length} (total: NGN ${totalAvail})`);
      console.log(`- Wallets with pending balance > 0: ${positivePending.length} (total: NGN ${totalPending})`);
    }

    // Wallet Transactions
    const { data: txns, count: txnCount } = await client.from('wallet_transactions').select('*', { count: 'exact' });
    console.log(`Wallet transactions: count=${txnCount}`);
    if (txns && txns.length > 0) {
      const completed = txns.filter(t => ['completed', 'success'].includes(t.status?.toLowerCase()));
      const pending = txns.filter(t => t.status?.toLowerCase() === 'pending');
      console.log(`- Completed/success transactions: ${completed.length}`);
      console.log(`- Pending transactions: ${pending.length}`);
    }

    // Confessions & Reports
    const { count: confessionCount } = await client.from('confessions').select('*', { count: 'exact', head: true });
    const { count: reportCount } = await client.from('confession_reports').select('*', { count: 'exact', head: true });
    console.log(`Confessions: count=${confessionCount}`);
    console.log(`Confession reports: count=${reportCount}`);

    // Withdrawals
    const { count: withdrawalCount } = await client.from('withdrawals').select('*', { count: 'exact', head: true });
    console.log(`Withdrawals: count=${withdrawalCount}`);

    // Admin Audit Logs
    const { count: auditCount } = await client.from('admin_audit_logs').select('*', { count: 'exact', head: true });
    console.log(`Admin audit logs: count=${auditCount}`);

    // Promo Codes
    const { count: promoCount } = await client.from('promo_codes').select('*', { count: 'exact', head: true });
    console.log(`Promo codes: count=${promoCount}`);
}

main().catch(console.error);
