import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envFile = fs.readFileSync("c:\\college-date\\.env", "utf8");
let supabaseUrl = "";
let supabaseAnon = "";
for (const line of envFile.split("\n")) {
  if (line.startsWith("VITE_SUPABASE_URL=")) supabaseUrl = line.split("=")[1].trim();
  if (line.startsWith("VITE_SUPABASE_ANON_KEY=")) supabaseAnon = line.split("=")[1].trim();
}

const supabase = createClient(supabaseUrl, supabaseAnon);

async function testOnboarding() {
  const testEmail = `test.onboard.${Date.now()}@thecollegedate.com`;
  const testPassword = "Password123!Test";
  
  console.log("1. Signing up:", testEmail);
  const { data: signUpData, error: signErr } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        role: "Male"
      }
    }
  });

  if (signErr) {
    console.error("SignUp Error:", signErr);
    return;
  }

  console.log("User signed up:", signUpData.user?.id, "Session exists:", !!signUpData.session);

  const profileData = {
    full_name: "Test User",
    age: 21,
    university: "University of Lagos (UNILAG)",
    level: "300 Level",
    interests: ["Tech", "Music"],
    attraction_goal: "Casual",
    profile_photos: ["https://gedoyoleoscgxgdqszzc.supabase.co/storage/v1/object/public/profile-photos/test.webp"],
    avatar_url: "https://gedoyoleoscgxgdqszzc.supabase.co/storage/v1/object/public/profile-photos/test.webp",
    email: testEmail,
    is_onboarded: true,
    updated_at: new Date().toISOString()
  };

  console.log("2. Running upsertProfile...");
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: signUpData.user.id, ...profileData })
    .select()
    .single();

  if (error) {
    console.error("UPSERT ERROR:", error);
  } else {
    console.log("UPSERT SUCCESS:", data.id, data.full_name, data.is_onboarded);
  }
}

testOnboarding();
