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

async function twoUserTest() {
  console.log("=== TWO-USER REFERRAL TEST ===");
  const refereeEmail = `test.referee.${Date.now()}@thecollegedate.com`;
  const refereePassword = "CollegeDate2026!Referee";

  console.log("1. Signing up new User B:", refereeEmail);
  const { data: signUpData, error: signErr } = await supabase.auth.signUp({
    email: refereeEmail,
    password: refereePassword,
    options: {
      data: {
        full_name: "Jordan Referee",
        gender: "Female",
        role: "Female"
      }
    }
  });

  if (signErr) {
    console.log("Sign up result error:", signErr.message);
    return;
  }

  console.log("   User B created with ID:", signUpData.user?.id);

  if (!signUpData.session) {
    console.log("   Session not immediately returned (email confirmation required or similar).");
    return;
  }

  console.log("2. Applying User A referral code CD-KIHZF as User B...");
  const { data: applyData, error: applyErr } = await supabase.rpc("apply_referral_code", {
    p_code: "CD-KIHZF"
  });
  console.log("   apply_referral_code result:", applyData, "error:", applyErr);

  console.log("3. Verifying User B profile has referred_by set to Alex Davis...");
  const { data: bProfile } = await supabase.from("profiles").select("id, full_name, referred_by").eq("id", signUpData.user.id).single();
  console.log("   User B Profile:", bProfile);

  console.log("4. Attempting duplicate attribution (applying CD-KIHZF again)...");
  const { data: dupData } = await supabase.rpc("apply_referral_code", {
    p_code: "CD-KIHZF"
  });
  console.log("   Duplicate application result:", dupData);

  console.log("5. Attempting to switch referrer to another code...");
  const { data: switchData } = await supabase.rpc("apply_referral_code", {
    p_code: "ANOTHER-CODE"
  });
  console.log("   Switch referrer result:", switchData);
}

twoUserTest();
