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

async function checkUsers() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "student.tester2026@gmail.com",
    password: "CollegeDate2026!VerifiedPass"
  });
  console.log("Auth session user:", authData?.user?.email, "Error:", authErr?.message);

  const { data: users, error: uErr } = await supabase.from("profiles").select("id, email, full_name, role, is_premium, gender, avatar_url, profile_photos").neq("id", "1e618bba-9d24-4262-b3c0-1b24b4ff40ff").limit(10);
  console.log("Other users in DB:", users?.length, "Error:", uErr);
  if (users?.length) {
    console.log("Sample users:", users.slice(0, 3));
  }

  console.log("\nTesting getDiscoverProfiles query directly:");
  const { data: disc, error: discErr } = await supabase
    .from('discovery_feed_v3')
    .select('*')
    .or('avatar_url.not.is.null,profile_photos.not.eq.{}')
    .limit(5);
  console.log("Discovery query count:", disc?.length, "Error:", discErr);
}
checkUsers();
