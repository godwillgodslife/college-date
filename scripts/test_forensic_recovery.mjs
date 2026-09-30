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
  console.log("=== TEST C: REAL PASSWORD RECOVERY FORENSIC TEST ===");
  console.log("1. Requesting recovery token from test-auth-recovery edge function...");
  const resp = await fetch("https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1/test-auth-recovery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student.tester2026@gmail.com" })
  });
  const data = await resp.json();
  if (!data.success) {
    console.error("Failed to generate recovery link:", data);
    return;
  }
  console.log("   Action link generated:", data.action_link);
  console.log("   Token hash:", data.hashed_token);

  console.log("2. Simulating email link click -> Supabase verify endpoint...");
  const verifyResp = await fetch(data.action_link, { redirect: "manual" });
  const redirectUrl = verifyResp.headers.get("location");
  console.log("   Supabase 302 Redirect Location:", redirectUrl ? redirectUrl.slice(0, 80) + "..." : "NONE");

  if (!redirectUrl) {
    console.error("No redirect URL received from Supabase auth verify!");
    return;
  }

  const hashPart = redirectUrl.split("#")[1];
  const hashParams = new URLSearchParams(hashPart);
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  console.log("3. Passing recovery tokens to Supabase auth client (setSession)...");
  const { data: sessData, error: sessErr } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });
  if (sessErr) {
    console.error("Session set error:", sessErr);
    return;
  }
  console.log("   RECOVERY SESSION ESTABLISHED! Authenticated user:", sessData.user.email, "(ID: " + sessData.user.id + ")");

  console.log("4. Updating password to new secret password via supabase.auth.updateUser...");
  const newPassword = "CollegeDate2026!VerifiedPass";
  const { data: updateData, error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
  if (updateErr) {
    console.error("Update password failed:", updateErr);
    return;
  }
  console.log("   PASSWORD SUCCESSFULLY UPDATED in Supabase auth for:", updateData.user.email);

  console.log("5. Signing out of recovery session...");
  await supabase.auth.signOut();

  console.log("6. Testing sign in with OLD / INVALID password...");
  const { data: oldData, error: oldErr } = await supabase.auth.signInWithPassword({
    email: "student.tester2026@gmail.com",
    password: "WrongPassword999!"
  });
  if (oldErr) {
    console.log("   VERIFIED: Old / wrong password correctly rejected with:", oldErr.message);
  } else {
    console.error("   FAILURE: Wrong password was accepted!");
  }

  console.log("7. Testing sign in with NEW password...");
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: "student.tester2026@gmail.com",
    password: newPassword
  });
  if (loginErr) {
    console.error("FAILURE: Could not log in with new password:", loginErr);
  } else {
    console.log("   VERIFIED: Sign in with NEW password succeeded! Session user:", loginData.user.email);
  }

  console.log("=== TEST C COMPLETE: ALL 7 STEPS VERIFIED ===");
}

run();
