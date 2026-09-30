import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envFile = fs.readFileSync(".env", "utf8");
let supabaseUrl = "";
let supabaseAnon = "";
for (const line of envFile.split("\n")) {
  if (line.startsWith("VITE_SUPABASE_URL=")) supabaseUrl = line.split("=")[1].trim();
  if (line.startsWith("VITE_SUPABASE_ANON_KEY=")) supabaseAnon = line.split("=")[1].trim();
}

const supabase = createClient(supabaseUrl, supabaseAnon);

async function run() {
  console.log("=== SECTION 9 & 10: REFERRAL SYSTEM FORENSIC AUDIT ===");

  // 1. Validate non-existent code
  console.log("1. Testing non-existent referral code...");
  const { data: nonExistent, error: err1 } = await supabase.rpc("validate_referral_code", { p_code: "NONEXISTENT999" });
  console.log("   Result:", nonExistent);

  // 2. Validate malformed code
  console.log("2. Testing malformed referral code ('  cd-kihzf!!  ')...");
  const { data: malformed, error: err2 } = await supabase.rpc("validate_referral_code", { p_code: "  cd-kihzf!!  " });
  console.log("   Result:", malformed);

  // 3. Authenticate as Alex Davis (student.tester2026@gmail.com)
  console.log("3. Authenticating as Alex Davis to test self-referral and application...");
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: "student.tester2026@gmail.com",
    password: "CollegeDate2026!VerifiedPass"
  });
  if (loginErr) {
    console.error("   Login failed:", loginErr);
    return;
  }
  const alexId = loginData.user.id;
  console.log("   Authenticated as Alex Davis (ID:", alexId, ")");

  // Fetch Alex's referral code
  const { data: alexProfile } = await supabase.from("profiles").select("id, referral_code, referred_by").eq("id", alexId).single();
  console.log("   Alex referral code:", alexProfile.referral_code, "referred_by:", alexProfile.referred_by);

  // 4. Test self-referral: Alex trying to use Alex's own referral code
  console.log("4. Testing self-referral (Alex using own code: " + alexProfile.referral_code + ")...");
  const { data: selfResult, error: selfErr } = await supabase.rpc("apply_referral_code", { p_code: alexProfile.referral_code });
  console.log("   Self-referral result:", selfResult);

  // 5. Test applying code if already attributed
  if (alexProfile.referred_by) {
    console.log("5. Alex already has referred_by set to:", alexProfile.referred_by);
    console.log("   Testing applying another code (CD-KIHZF)...");
    const { data: reapplyResult, error: reapplyErr } = await supabase.rpc("apply_referral_code", { p_code: "CD-KIHZF" });
    console.log("   Re-apply result:", reapplyResult);
  }

  // 6. Inspect referral stats table / RPC
  console.log("6. Inspecting referral counts for referrer CD-KIHZF...");
  const { data: referrerUser } = await supabase.from("profiles").select("id, full_name, referral_code").ilike("referral_code", "CD-KIHZF").single();
  if (referrerUser) {
    const { count, error: countErr } = await supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", referrerUser.id);
    console.log("   Referrer:", referrerUser.full_name, "Code:", referrerUser.referral_code, "Total referrals attributed:", count);
  }

  console.log("=== REFERRAL FORENSIC TESTS COMPLETE ===");
}

run();
